import { describe, expect, it } from "vitest";
import { fakeFetch } from "@/test/fake-fetch";
import { findLink, htmlToText, isPrivateAddress, readLinkText } from "./link-reader";

const publicDns = async () => ["93.184.216.34"];
const page = (html: string, status = 200, headers: Record<string, string> = {}) =>
  new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", ...headers } });
const JOB = `<html><head><style>.x{}</style><script>var a=1</script></head><body><h1>Sales Manager</h1><p>Acme Corp is hiring a Sales Manager &amp; team lead to grow B2B accounts across Texas. You will own the pipeline.</p></body></html>`;

describe("isPrivateAddress", () => {
  it("flags loopback, private, link-local and metadata addresses", () => {
    for (const a of ["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1"]) {
      expect(isPrivateAddress(a)).toBe(true);
    }
  });

  it("allows public addresses", () => {
    expect(isPrivateAddress("93.184.216.34")).toBe(false);
    expect(isPrivateAddress("2606:4700::1111")).toBe(false);
  });
});

describe("htmlToText", () => {
  it("keeps the visible text only", () => {
    const text = htmlToText(JOB);
    expect(text).toContain("Sales Manager");
    expect(text).toContain("Sales Manager & team lead");
    expect(text).not.toContain("var a");
    expect(text).not.toContain(".x{}");
  });

  it("decodes numeric entities", () => {
    expect(htmlToText("<p>caf&#233; &#x2713;</p>")).toBe("café ✓");
  });
});

describe("findLink", () => {
  it("finds the first link and drops trailing punctuation", () => {
    expect(findLink("Applying here: https://jobs.example.com/123. Thanks")).toBe("https://jobs.example.com/123");
    expect(findLink("no link here")).toBeNull();
  });
});

describe("readLinkText", () => {
  it("reads a public job page", async () => {
    const { fetch } = fakeFetch({ "jobs.example.com": page(JOB) });
    expect(await readLinkText("https://jobs.example.com/1", fetch, publicDns)).toContain("Acme Corp is hiring");
  });

  it("refuses private hosts, odd ports and other schemes before fetching", async () => {
    const { fetch, calls } = fakeFetch({});
    for (const url of ["http://localhost/x", "http://169.254.169.254/latest", "file:///etc/passwd", "https://a.example.com:8443/", "https://user:pw@a.example.com/"]) {
      await expect(readLinkText(url, fetch, publicDns)).rejects.toMatchObject({ code: "link_unreadable" });
    }
    await expect(readLinkText("https://inside.example.com/", fetch, async () => ["10.0.0.5"])).rejects.toMatchObject({ code: "link_unreadable" });
    expect(calls).toHaveLength(0);
  });

  it("checks every redirect target", async () => {
    const { fetch, calls } = fakeFetch({ "jobs.example.com": page("", 302, { location: "http://127.0.0.1/admin" }) });
    await expect(readLinkText("https://jobs.example.com/1", fetch, publicDns)).rejects.toMatchObject({ code: "link_unreadable" });
    expect(calls).toHaveLength(1);
  });

  it("follows a safe redirect", async () => {
    const { fetch } = fakeFetch({
      "short.example.com": page("", 301, { location: "https://jobs.example.com/full" }),
      "jobs.example.com": page(JOB),
    });
    expect(await readLinkText("https://short.example.com/x", fetch, publicDns)).toContain("Sales Manager");
  });

  it("refuses pages that are not text, fail, or say almost nothing", async () => {
    const pdf = fakeFetch({ "a.example.com": new Response("%PDF", { headers: { "content-type": "application/pdf" } }) });
    await expect(readLinkText("https://a.example.com/", pdf.fetch, publicDns)).rejects.toMatchObject({ code: "link_unreadable" });
    const gone = fakeFetch({ "a.example.com": page("Not found", 404) });
    await expect(readLinkText("https://a.example.com/", gone.fetch, publicDns)).rejects.toMatchObject({ code: "link_unreadable" });
    const thin = fakeFetch({ "a.example.com": page("<p>Sign in</p>") });
    await expect(readLinkText("https://a.example.com/", thin.fetch, publicDns)).rejects.toMatchObject({ code: "link_unreadable" });
    const offline = fakeFetch({});
    await expect(readLinkText("https://a.example.com/", offline.fetch, publicDns)).rejects.toMatchObject({ code: "link_unreadable" });
  });
});
