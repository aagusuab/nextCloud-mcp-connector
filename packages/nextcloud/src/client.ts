import { createClient, type WebDAVClient, type FileStat } from "webdav";
import type { NextcloudConfig, FileInfo, ShareLink } from "@mcp-connectors/core";

export class NextcloudClient {
  private webdav: WebDAVClient;
  private config: NextcloudConfig;

  constructor(config: NextcloudConfig) {
    this.config = config;
    // WebDAV endpoint for files
    this.webdav = createClient(`${config.baseUrl}/remote.php/dav/files/${config.username}`, {
      username: config.username,
      password: config.password,
    });
  }

  // ============ FILE OPERATIONS ============

  async listFiles(path: string = "/"): Promise<FileInfo[]> {
    const contents = await this.webdav.getDirectoryContents(path) as FileStat[];
    return contents.map((item) => ({
      filename: item.filename,
      basename: item.basename,
      type: item.type as "file" | "directory",
      size: item.size,
      lastmod: item.lastmod,
      etag: item.etag,
      mime: item.mime,
    }));
  }

  async readFile(path: string): Promise<string> {
    const content = await this.webdav.getFileContents(path, { format: "text" });
    return content as string;
  }

  async uploadFile(path: string, content: string): Promise<void> {
    await this.webdav.putFileContents(path, content);
  }

  async delete(path: string): Promise<void> {
    await this.webdav.deleteFile(path);
  }

  async createShare(path: string, options?: { password?: string; expireDate?: string }): Promise<ShareLink> {
    // Use OCS Share API
    const url = `${this.config.baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares`;

    const formData = new URLSearchParams();
    formData.append("path", path);
    formData.append("shareType", "3"); // Public link

    if (options?.password) {
      formData.append("password", options.password);
    }
    if (options?.expireDate) {
      formData.append("expireDate", options.expireDate);
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64")}`,
        "OCS-APIRequest": "true",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to create share: ${response.statusText}`);
    }

    const data = await response.json() as { ocs: { data: { id: number; url: string; token: string; path: string; expiration?: string; password?: string } } };
    const share = data.ocs.data;

    return {
      id: String(share.id),
      url: share.url,
      token: share.token,
      path: share.path,
      expiration: share.expiration,
      password: !!share.password,
    };
  }

  // ============ CALENDAR OPERATIONS ============

  async listCalendarEvents(
    calendarId: string = "personal",
    startDate?: string,
    endDate?: string
  ): Promise<Array<{ uid: string; summary: string; start: string; end: string; raw: string }>> {
    const calendarUrl = `${this.config.baseUrl}/remote.php/dav/calendars/${this.config.username}/${calendarId}/`;

    // Build REPORT request for calendar query
    let timeRange = "";
    if (startDate || endDate) {
      const start = startDate ? `${startDate}T00:00:00Z` : "19700101T000000Z";
      const end = endDate ? `${endDate}T23:59:59Z` : "20991231T235959Z";
      timeRange = `<c:time-range start="${start.replace(/-/g, "")}" end="${end.replace(/-/g, "")}"/>`;
    }

    const body = `<?xml version="1.0" encoding="utf-8" ?>
      <c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
        <d:prop>
          <d:getetag/>
          <c:calendar-data/>
        </d:prop>
        <c:filter>
          <c:comp-filter name="VCALENDAR">
            <c:comp-filter name="VEVENT">
              ${timeRange}
            </c:comp-filter>
          </c:comp-filter>
        </c:filter>
      </c:calendar-query>`;

    const response = await fetch(calendarUrl, {
      method: "REPORT",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64")}`,
        "Content-Type": "application/xml; charset=utf-8",
        "Depth": "1",
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Failed to list calendar events: ${response.statusText}`);
    }

    const text = await response.text();
    return this.parseCalendarResponse(text);
  }

  private parseCalendarResponse(xml: string): Array<{ uid: string; summary: string; start: string; end: string; raw: string }> {
    const events: Array<{ uid: string; summary: string; start: string; end: string; raw: string }> = [];

    // Simple regex-based parsing for iCalendar data
    const calDataMatches = xml.matchAll(/<cal:calendar-data[^>]*>([\s\S]*?)<\/cal:calendar-data>/gi);

    for (const match of calDataMatches) {
      const icalData = match[1]
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");

      const uid = icalData.match(/UID:(.+)/)?.[1]?.trim() || "";
      const summary = icalData.match(/SUMMARY:(.+)/)?.[1]?.trim() || "";
      const dtstart = icalData.match(/DTSTART[^:]*:(.+)/)?.[1]?.trim() || "";
      const dtend = icalData.match(/DTEND[^:]*:(.+)/)?.[1]?.trim() || "";

      if (uid) {
        events.push({
          uid,
          summary,
          start: dtstart,
          end: dtend,
          raw: icalData,
        });
      }
    }

    return events;
  }

  async createCalendarEvent(
    calendarId: string,
    event: { summary: string; description?: string; start: string; end: string; location?: string }
  ): Promise<string> {
    const uid = `${Date.now()}-${Math.random().toString(36).substring(2)}@mcp-connector`;
    const eventUrl = `${this.config.baseUrl}/remote.php/dav/calendars/${this.config.username}/${calendarId}/${uid}.ics`;

    const formatDateTime = (dt: string) => dt.replace(/[-:]/g, "").replace(/\.\d{3}/, "");

    const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MCP Connector//EN
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatDateTime(new Date().toISOString())}
DTSTART:${formatDateTime(event.start)}
DTEND:${formatDateTime(event.end)}
SUMMARY:${event.summary}
${event.description ? `DESCRIPTION:${event.description}` : ""}
${event.location ? `LOCATION:${event.location}` : ""}
END:VEVENT
END:VCALENDAR`;

    const response = await fetch(eventUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64")}`,
        "Content-Type": "text/calendar; charset=utf-8",
      },
      body: icalContent,
    });

    if (!response.ok) {
      throw new Error(`Failed to create event: ${response.statusText}`);
    }

    return uid;
  }

  async deleteCalendarEvent(calendarId: string, eventId: string): Promise<void> {
    const eventUrl = `${this.config.baseUrl}/remote.php/dav/calendars/${this.config.username}/${calendarId}/${eventId}.ics`;

    const response = await fetch(eventUrl, {
      method: "DELETE",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete event: ${response.statusText}`);
    }
  }

  // ============ CONTACT OPERATIONS ============

  async listContacts(addressBookId: string = "contacts"): Promise<Array<{ uid: string; fullName: string; email?: string; raw: string }>> {
    const addressBookUrl = `${this.config.baseUrl}/remote.php/dav/addressbooks/users/${this.config.username}/${addressBookId}/`;

    const body = `<?xml version="1.0" encoding="utf-8" ?>
      <c:addressbook-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:carddav">
        <d:prop>
          <d:getetag/>
          <c:address-data/>
        </d:prop>
      </c:addressbook-query>`;

    const response = await fetch(addressBookUrl, {
      method: "REPORT",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64")}`,
        "Content-Type": "application/xml; charset=utf-8",
        "Depth": "1",
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Failed to list contacts: ${response.statusText}`);
    }

    const text = await response.text();
    return this.parseContactsResponse(text);
  }

  private parseContactsResponse(xml: string): Array<{ uid: string; fullName: string; email?: string; raw: string }> {
    const contacts: Array<{ uid: string; fullName: string; email?: string; raw: string }> = [];

    const cardDataMatches = xml.matchAll(/<card:address-data[^>]*>([\s\S]*?)<\/card:address-data>/gi);

    for (const match of cardDataMatches) {
      const vcardData = match[1]
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");

      const uid = vcardData.match(/UID:(.+)/)?.[1]?.trim() || "";
      const fn = vcardData.match(/FN:(.+)/)?.[1]?.trim() || "";
      const email = vcardData.match(/EMAIL[^:]*:(.+)/)?.[1]?.trim();

      if (uid) {
        contacts.push({
          uid,
          fullName: fn,
          email,
          raw: vcardData,
        });
      }
    }

    return contacts;
  }

  async getContact(addressBookId: string, contactId: string): Promise<{ uid: string; fullName: string; email?: string; phone?: string; organization?: string; raw: string }> {
    const contactUrl = `${this.config.baseUrl}/remote.php/dav/addressbooks/users/${this.config.username}/${addressBookId}/${contactId}.vcf`;

    const response = await fetch(contactUrl, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get contact: ${response.statusText}`);
    }

    const vcardData = await response.text();

    return {
      uid: vcardData.match(/UID:(.+)/)?.[1]?.trim() || contactId,
      fullName: vcardData.match(/FN:(.+)/)?.[1]?.trim() || "",
      email: vcardData.match(/EMAIL[^:]*:(.+)/)?.[1]?.trim(),
      phone: vcardData.match(/TEL[^:]*:(.+)/)?.[1]?.trim(),
      organization: vcardData.match(/ORG:(.+)/)?.[1]?.trim(),
      raw: vcardData,
    };
  }

  async createContact(
    addressBookId: string,
    contact: { fullName: string; email?: string; phone?: string; organization?: string; note?: string }
  ): Promise<string> {
    const uid = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const contactUrl = `${this.config.baseUrl}/remote.php/dav/addressbooks/users/${this.config.username}/${addressBookId}/${uid}.vcf`;

    const vcardContent = `BEGIN:VCARD
VERSION:3.0
UID:${uid}
FN:${contact.fullName}
N:${contact.fullName.split(" ").reverse().join(";")};;;
${contact.email ? `EMAIL:${contact.email}` : ""}
${contact.phone ? `TEL:${contact.phone}` : ""}
${contact.organization ? `ORG:${contact.organization}` : ""}
${contact.note ? `NOTE:${contact.note}` : ""}
END:VCARD`.split("\n").filter(line => line.trim()).join("\r\n");

    const response = await fetch(contactUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64")}`,
        "Content-Type": "text/vcard; charset=utf-8",
      },
      body: vcardContent,
    });

    if (!response.ok) {
      throw new Error(`Failed to create contact: ${response.statusText}`);
    }

    return uid;
  }
}
