# SecureDesk - Demoalusta kerrokselliselle tietoturva-arkkitehtuurille modernissa web-sovelluksessa

- Tavoite: esitellä, miten useita tietoturvakerroksia voidaan toteuttaa modernissa web-sovelluksessa.
- Sovellus itsessään on tarkoituksella yksinkertainen, jotta fokus pysyy tietoturva-arkkitehtuurissa.

---

## 1. Projektin idea

- SecureDesk on pieni tukipyyntösovellus.
- Projektin päätavoite ei ollut rakentaa monimutkaista sovellusta.
- Päätavoite oli suunnitella ja toteuttaa kerroksellinen tietoturva moderniin web-sovellukseen.
- Sovellus toimii ennen kaikkea demoalustana tietoturva-arkkitehtuurille.

---

## 2. Sovelluksen yleiskuva

- Roolit: `CUSTOMER` ja `STAFF`.
- Customer voi luoda tukipyyntöjä ja nähdä vain omat pyyntönsä.
- Staff voi nähdä kaikki pyynnöt, vastata niihin, muuttaa tilaa ja tarkastella audit-lokia.
- Domain on tarkoituksella yksinkertainen, jotta fokus pysyy tietoturvassa.

**Katsotaan nopeasti miltä sovellus näyttää käytännössä.**

---

## 3. Kerroksellinen tietoturva

Sovelluksessa ei luoteta yhteen suojaan.
Turvallisuus perustuu useaan toisistaan riippumattomaan kerrokseen.

Tärkeimmät kerrokset:

- rate limiting
- input validation
- authentication
- authorization
- data access layer
- safe error handling
- audit logging

Ajatus on **defense in depth**:

- jos yksi kerros heikkenee tai pettää, muut kerrokset suojaavat edelleen.

Monet näistä kerroksista näkyvät myös sovelluksen käytössä demon aikana.

---

## 4. Keskeiset tietoturvapää­tökset

Näitä päätöksiä nähdään myös käytännössä demon aikana.

**RBAC**

- käyttöoikeudet määritellään roolin mukaan
- `CUSTOMER` ja `STAFF` näkevät eri asiat, lisää rooleja helposti lisättävissä.

**Omistajuuden tarkistus / Data access layer**

- customer pääsee vain omaan dataansa
- tietokantakyselyt rajataan omistajuuden mukaan

**Resurssien tunnistamisen estäminen (Enumeration protection)**

- omistajuusvirheissä palautetaan `404`
- resurssien olemassaoloa ei paljasteta

**Turvallinen virheenkäsittely**

- käyttäjälle ei näytetä sisäisiä virheitä
- ei stack traceja tai tietokantavirheitä

**Audit logging**

- lokitetaan turvallisuuskriittiset tapahtumat

**Server Actions**

- käytetään Server Actionseja REST-endpointtien sijaan
- Next.js server actions jotta olisi, pienempi julkinen hyökkäys pinta
- server actionsit integroituu hyvin muihin kerroksiin, kuten auditointiin ja rate-limittiin

---

## 5. Kaytetyt teknologiat

Teknologiat valittiin tukemaan modernia server-side arkkitehtuuria ja turvallista toteutusta.

- Next.js + TypeScript
- Prisma ORM + PostgreSQL (docker)
- Auth.js / NextAuth
- Zod-validointi
- moderni server-side arkkitehtuuri

---

## 6. Mita opin projektin aikana

Kurssin tavoitteena oli oppia uusia teknologioita ja kehityskäytäntöjä.

Projektin aikana opin:

- kerroksellisen sovellustietoturvan käytännössä
- Prisma ORM kunnolla ensimmäistä kertaa
- Auth.js / NextAuth -autentikaatio
- parempi Next.js projektirakenne ja arkkitehtuuri
- AI-työkalujen ja agenttien tehokkaamman hyödyntämisen paremmilla ohjeilla ja dokumentaatiolla

Projekti oli siis sekä tietoturva-arkkitehtuurin demo että oppimisprojekti.

---

## 7. Tietoturvan näkyminen käytännössä (demo)

Lyhyt demo siitä, miten tietoturvakerrokset näkyvät käytännössä.

Näytetään esimerkiksi:

- kirjautuminen customer- ja staff-rooleilla
- roolien ero käyttöliittymässä ja oikeuksissa
- ticket-näkymä ja omistajuuden merkitys
- audit-loki

Esimerkkejä audit-lokista:

- `AUTH_LOGIN_FAILED`
- `FORBIDDEN_ACTION_ATTEMPT`
- `RATE_LIMIT_TRIGGERED`

---

## Yhteenveto

- Sovellus on tarkoituksella yksinkertainen.
- Tärkeintä ei ole sovelluksen monimutkaisuus.
- Tärkeintä on se, miten useita tietoturvakerroksia voidaan rakentaa moderniin web-sovellukseen.

---
