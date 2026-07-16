import { PrismaClient, ContentStatus, CreatedBy } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const cities = [
  { nameSq: "Tiranë", nameEn: "Tirana", nameIt: "Tirana", slug: "tirane" },
  { nameSq: "Durrës", nameEn: "Durres", nameIt: "Durazzo", slug: "durres" },
  { nameSq: "Vlorë", nameEn: "Vlora", nameIt: "Valona", slug: "vlore" },
  { nameSq: "Shkodër", nameEn: "Shkodra", nameIt: "Scutari", slug: "shkoder" },
  { nameSq: "Elbasan", nameEn: "Elbasan", nameIt: "Elbasan", slug: "elbasan" },
  { nameSq: "Fier", nameEn: "Fier", nameIt: "Fier", slug: "fier" },
  { nameSq: "Korçë", nameEn: "Korca", nameIt: "Corizza", slug: "korce" },
  { nameSq: "Berat", nameEn: "Berat", nameIt: "Berat", slug: "berat" },
  { nameSq: "Lushnjë", nameEn: "Lushnja", nameIt: "Lushnja", slug: "lushnje" },
  { nameSq: "Pogradec", nameEn: "Pogradec", nameIt: "Pogradec", slug: "pogradec" },
  { nameSq: "Gjirokastër", nameEn: "Gjirokastra", nameIt: "Argirocastro", slug: "gjirokaster" },
  { nameSq: "Sarandë", nameEn: "Saranda", nameIt: "Saranda", slug: "sarande" },
];

const specialties = [
  { nameSq: "Dentist", nameEn: "Dentist", nameIt: "Dentista", slug: "dentist", icon: "smile" },
  { nameSq: "Pediatër", nameEn: "Pediatrician", nameIt: "Pediatra", slug: "pediater", icon: "baby" },
  { nameSq: "Gjinekolog", nameEn: "Gynecologist", nameIt: "Ginecologo", slug: "gjinekolog", icon: "heart-handshake" },
  { nameSq: "Kardiolog", nameEn: "Cardiologist", nameIt: "Cardiologo", slug: "kardiolog", icon: "heart-pulse" },
  { nameSq: "Dermatolog", nameEn: "Dermatologist", nameIt: "Dermatologo", slug: "dermatolog", icon: "scan-face" },
  { nameSq: "Okulista", nameEn: "Ophthalmologist", nameIt: "Oculista", slug: "okulista", icon: "eye" },
  { nameSq: "Psikolog", nameEn: "Psychologist", nameIt: "Psicologo", slug: "psikolog", icon: "brain" },
  { nameSq: "Ortoped", nameEn: "Orthopedist", nameIt: "Ortopedico", slug: "ortoped", icon: "bone" },
  { nameSq: "Neurolog", nameEn: "Neurologist", nameIt: "Neurologo", slug: "neurolog", icon: "activity" },
  { nameSq: "Urolog", nameEn: "Urologist", nameIt: "Urologo", slug: "urolog", icon: "droplets" },
  { nameSq: "Endokrinolog", nameEn: "Endocrinologist", nameIt: "Endocrinologo", slug: "endokrinolog", icon: "test-tubes" },
  { nameSq: "Gastroenterolog", nameEn: "Gastroenterologist", nameIt: "Gastroenterologo", slug: "gastroenterolog", icon: "pill" },
  { nameSq: "Otorinolaringolog (ORL)", nameEn: "ENT Specialist", nameIt: "Otorinolaringoiatra", slug: "orl", icon: "ear" },
  { nameSq: "Kirurg i përgjithshëm", nameEn: "General Surgeon", nameIt: "Chirurgo generale", slug: "kirurg", icon: "scissors" },
  { nameSq: "Onkolog", nameEn: "Oncologist", nameIt: "Oncologo", slug: "onkolog", icon: "ribbon" },
  { nameSq: "Reumatolog", nameEn: "Rheumatologist", nameIt: "Reumatologo", slug: "reumatolog", icon: "accessibility" },
  { nameSq: "Pneumolog", nameEn: "Pulmonologist", nameIt: "Pneumologo", slug: "pneumolog", icon: "wind" },
  { nameSq: "Nefrolog", nameEn: "Nephrologist", nameIt: "Nefrologo", slug: "nefrolog", icon: "droplet" },
  { nameSq: "Mjek i përgjithshëm", nameEn: "General Practitioner", nameIt: "Medico generico", slug: "mjek-i-pergjithshem", icon: "stethoscope" },
  { nameSq: "Psikiatër", nameEn: "Psychiatrist", nameIt: "Psichiatra", slug: "psikiater", icon: "message-circle" },
];

// Klinika reale publike në Tiranë — vetëm të dhëna publike
const clinics = [
  { name: "Spitali Amerikan", slug: "spitali-amerikan-tirane", address: "Rruga e Dibrës, Tiranë" },
  { name: "Hygeia Hospital Tirana", slug: "hygeia-hospital-tirana", address: "Autostrada Tiranë-Durrës, Km 8" },
  { name: "Salus Hospital", slug: "salus-hospital", address: "Rruga e Elbasanit, Tiranë" },
  { name: "Continental Hospital", slug: "continental-hospital", address: "Rruga e Kavajës, Tiranë" },
  { name: "German Hospital Tirana", slug: "german-hospital-tirana", address: "Rruga e Durrësit, Tiranë" },
  { name: "Spitali Universitar 'Nënë Tereza' (QSUT)", slug: "qsut-nene-tereza", address: "Rruga e Dibrës 372, Tiranë" },
  { name: "Klinika Zana", slug: "klinika-zana", address: "Bulevardi Zogu I, Tiranë" },
  { name: "Poliklinika Qendrore", slug: "poliklinika-qendrore", address: "Bulevardi Bajram Curri, Tiranë" },
  { name: "Klinika Dentare Star Dent", slug: "star-dent", address: "Rruga Myslym Shyri, Tiranë" },
  { name: "Qendra Mjekësore Diamed", slug: "diamed", address: "Rruga e Kavajës 116, Tiranë" },
];

// SHËNIM: mjekë FIKTIVË placeholder — do të zëvendësohen me të dhëna reale para lançimit
const doctorFirstNames = ["Arben", "Besnik", "Dritan", "Elira", "Fatmira", "Gentian", "Ilir", "Jonida", "Klodian", "Luljeta", "Mirela", "Ndriçim", "Ornela", "Pëllumb", "Rezarta", "Sokol", "Teuta", "Valbona", "Ylli", "Zamira", "Altin", "Brikena", "Dashamir", "Eriona", "Flamur", "Greta", "Hektor", "Irena", "Kastriot", "Linda"];
const doctorLastNames = ["Hoxha", "Shehu", "Kola", "Basha", "Rama", "Meta", "Duka", "Leka", "Marku", "Gjoni", "Prifti", "Çela", "Bardhi", "Kraja", "Deda", "Malaj", "Toska", "Zeneli", "Frashëri", "Kadiu", "Sula", "Bushati", "Nika", "Curri", "Dervishi", "Lamaj", "Peza", "Qosja", "Skënderi", "Vata"];

async function main() {
  for (const c of cities) {
    await prisma.city.upsert({ where: { slug: c.slug }, update: c, create: c });
  }
  for (const s of specialties) {
    await prisma.specialty.upsert({ where: { slug: s.slug }, update: s, create: s });
  }

  const tirana = await prisma.city.findUniqueOrThrow({ where: { slug: "tirane" } });
  for (const cl of clinics) {
    await prisma.clinic.upsert({
      where: { slug: cl.slug },
      update: {},
      create: {
        ...cl,
        cityId: tirana.id,
        status: ContentStatus.APPROVED,
        createdBy: CreatedBy.ADMIN,
      },
    });
  }

  const allSpecialties = await prisma.specialty.findMany();
  const allClinics = await prisma.clinic.findMany();
  for (let i = 0; i < 30; i++) {
    const firstName = doctorFirstNames[i];
    const lastName = doctorLastNames[i];
    const specialty = allSpecialties[i % allSpecialties.length];
    const clinic = allClinics[i % allClinics.length];
    const slug = `${firstName}-${lastName}-${specialty.slug}`
      .toLowerCase()
      .replace(/ë/g, "e")
      .replace(/ç/g, "c")
      .replace(/[^a-z0-9-]/g, "");
    await prisma.doctor.upsert({
      where: { slug },
      update: {},
      create: {
        firstName,
        lastName,
        slug,
        specialtyId: specialty.id,
        clinicId: clinic.id,
        cityId: tirana.id,
        status: ContentStatus.APPROVED,
        createdBy: CreatedBy.ADMIN,
      },
    });
  }

  const adminEmail = process.env.ADMIN_SEED_EMAIL;
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.adminUser.upsert({
      where: { email: adminEmail },
      update: { passwordHash },
      create: { email: adminEmail, passwordHash },
    });
  }

  // Asnjë review në seed — vlerësimet vijnë vetëm nga flow-i real me OTP
  console.log("Seed OK: 12 qytete, 20 specialitete, 10 klinika, 30 mjekë placeholder, 1 admin");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
