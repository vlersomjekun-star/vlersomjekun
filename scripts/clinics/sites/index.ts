import * as cheerio from "cheerio";
import type { ScrapedDoctor, SiteScraper } from "../lib/types";
import { parseScrapedName } from "../lib/matcher";

/**
 * Parser i përbashkët për temën WordPress të Spitalit Amerikan dhe Hygeia-s:
 * karta .doctor-item me h2.dr-title > a (emri, profili), span (specialiteti),
 * img.doctor-thumb (foto — vetëm URL si referencë e brendshme).
 */
function parseDrTitleTheme(html: string, clinicSlug: string): ScrapedDoctor[] {
  const $ = cheerio.load(html);
  const doctors: ScrapedDoctor[] = [];
  $(".doctor-item").each((_, el) => {
    const link = $(el).find("h2.dr-title a");
    const rawName = link.text().trim();
    if (!rawName) return;
    const { firstName, lastName, title } = parseScrapedName(rawName);
    if (!firstName || !lastName) return;
    doctors.push({
      firstName,
      lastName,
      title,
      specialty: $(el).find("h2.dr-title").next("span").text().trim() || null,
      profileUrl: link.attr("href") ?? null,
      photoUrl: $(el).find("img.doctor-thumb").attr("src") ?? null,
      clinicSlug,
    });
  });
  return doctors;
}

export const SITES: Record<string, SiteScraper> = {
  "spitali-amerikan": {
    clinic: {
      slug: "spitali-amerikan-tirane",
      name: "Spitali Amerikan",
      citySlug: "tirane",
      address: "Rruga e Dibrës, Tiranë",
      phone: "+355 4 235 7535",
    },
    staffUrl: "https://al.spitaliamerikan.com/stafi-mjekesor/",
    minExpected: 100,
    // SHËNIM: faqja e stafit nuk dallon degët (Fier/Durrës/Shkodër/Gjirokastër) —
    // të gjithë lidhen me klinikën e Tiranës; ndarja për degë kërkon burim tjetër.
    parse: (html) => parseDrTitleTheme(html, "spitali-amerikan-tirane"),
  },

  hygeia: {
    clinic: {
      slug: "hygeia-hospital-tirana",
      name: "Hygeia Hospital Tirana",
      citySlug: "tirane",
      address: "Autostrada Tiranë-Durrës, Km 8",
      phone: "+355 4 239 0000",
    },
    staffUrl: "https://hygeia.al/mjeket-tane/",
    minExpected: 100,
    parse: (html) => parseDrTitleTheme(html, "hygeia-hospital-tirana"),
  },

  salus: {
    clinic: {
      slug: "salus-hospital",
      name: "Salus Hospital",
      citySlug: "tirane",
      address: "Autostrada Tiranë-Durrës, Tiranë",
      phone: "+355 42 390 500",
    },
    staffUrl: "https://salus.al/mjeket/",
    minExpected: 60,
    parse: (html) => {
      const $ = cheerio.load(html);
      const doctors: ScrapedDoctor[] = [];
      $(".mjeket_all a.card-link").each((_, el) => {
        const rawName = $(el).find("h5.card-title").text().trim();
        if (!rawName) return;
        const { firstName, lastName, title } = parseScrapedName(rawName);
        if (!firstName || !lastName) return;
        const img = $(el).find("img.card-img-top").attr("src");
        const href = $(el).attr("href");
        doctors.push({
          firstName,
          lastName,
          title,
          specialty: $(el).find("h6.card-subtitle").text().trim() || null,
          profileUrl: href ? new URL(href, "https://salus.al").href : null,
          photoUrl: img ? new URL(img, "https://salus.al").href : null,
          clinicSlug: "salus-hospital",
        });
      });
      return doctors;
    },
  },

  "spitali-gjerman": {
    clinic: {
      slug: "german-hospital-tirana",
      name: "German Hospital Tirana",
      citySlug: "tirane",
      address: "Rruga e Durrësit, Tiranë",
      phone: "+355 67 600 6100",
    },
    staffUrl: "https://spitaligjerman.com/mjeket/",
    minExpected: 25,
    parse: (html) => {
      const $ = cheerio.load(html);
      const seen = new Set<string>();
      const doctors: ScrapedDoctor[] = [];
      // Mjekët janë linke drejt profileve /dr-*/ me tekstin "Dr. Emri Mbiemri"
      $('a[href*="spitaligjerman.com/dr-"]').each((_, el) => {
        const href = $(el).attr("href")!;
        if (seen.has(href)) return;
        const rawName = $(el).text().trim();
        if (!/^(Dr|Prof|Doc)/i.test(rawName)) return;
        seen.add(href);
        const { firstName, lastName, title } = parseScrapedName(rawName);
        if (!firstName || !lastName) return;
        doctors.push({
          firstName,
          lastName,
          title,
          specialty: null, // faqja e listës nuk e tregon
          profileUrl: href,
          photoUrl: null,
          clinicSlug: "german-hospital-tirana",
        });
      });
      return doctors;
    },
  },

  intermedica: {
    clinic: {
      slug: "intermedica",
      name: "Qendra Mjekësore Intermedica",
      citySlug: "tirane",
      address: "Rruga Engjëll Mashi, Astir, Tiranë",
    },
    staffUrl: "https://intermedica.al/stafi-yne/",
    minExpected: 5,
    parse: (html) => {
      const $ = cheerio.load(html);
      const doctors: ScrapedDoctor[] = [];
      const seen = new Set<string>();
      // Tema Divi: emrat janë në butonat nën kartat e team member
      $("a.et_pb_button").each((_, el) => {
        const rawName = $(el).text().trim();
        if (!/^(Dr|Prof|Doc)/i.test(rawName)) return;
        const { firstName, lastName, title } = parseScrapedName(rawName);
        if (!firstName || !lastName) return;
        const key = `${firstName}|${lastName}`.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        doctors.push({
          firstName,
          lastName,
          title,
          specialty: null,
          profileUrl: null,
          photoUrl: null,
          clinicSlug: "intermedica",
        });
      });
      return doctors;
    },
  },
};
