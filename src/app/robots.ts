// Plik robots.txt (/robots.txt). Panel wymaga logowania, więc roboty i tak
// trafiają wyłącznie na stronę logowania.
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" } };
}
