# SecureDesk – Projektisuunnitelma

## 1. Työn tavoite

Projektin tavoitteena on suunnitella ja toteuttaa tietoturvapainotteinen moderni web-sovellus (Support Ticket System), jossa pääpaino on kerroksellisessa tietoturvassa (Defense in Depth).

Vaikka sovellus on toiminnallinen asiakaspalvelujärjestelmä, projektin ensisijainen tavoite on demonstroida tietoturva-arkkitehtuuria, jossa turvallisuus on sisäänrakennettu sovelluksen eri kerroksiin: autentikaatiosta datan omistajuuden tarkistukseen ja audit-lokiin.

Projektin laajuus on rajattu tietoisesti pieneen mutta toiminnalliseen MVP-toteutukseen, jotta sovellus voidaan toteuttaa realistisesti käytettävissä olevan ajan puitteissa.

## 2. Valitut teknologiat

Sovellus toteutetaan modernilla TypeScript-pohjaisella web-teknologiapinolla.

- **Frontend & Framework:** Next.js (App Router), TypeScript.
- **UI-kirjasto:** shadcn/ui & Tailwind CSS.
- **Backend & API:** Next.js Server Actions (ensisijaisesti) sekä Route Handlers vain silloin kun tarvitaan erillinen HTTP-rajapinta (esim. Auth.js).
- **Tietokanta & ORM:** PostgreSQL (paikallisesti Docker Compose -ympäristössä) + Prisma ORM (v6).
- **Autentikaatio:** NextAuth (Auth.js).
- **Validointi:** Zod.
- **Testaus:** Vitest – yksikkö- ja integraatiotestit turvamekanismien varmistamiseksi.
- **Paikallinen kehitysympäristö** Docker Compose PostgreSQL-tietokannalle

**Uuden oppiminen:**
Projektissa syvennytään erityisesti seuraaviin aiheisiin:

- kerroksellinen tietoturva web-sovelluksissa

- RBAC-pohjainen pääsynhallinta (Role-Based Access Control)

- palvelintason datan omistajuuden tarkistus

- Rate Limiting -toteutus

- audit-lokin suunnittelu ja toteutus

- tietoturvaskenaarioiden testaaminen

Tavoitteena on oppia suunnittelemaan sovellus niin, että tietoturva ei ole erillinen lisäkerros, vaan osa arkkitehtuuria.

## 3. Sovelluksen kuvaus

SecureDesk on yksinkertaistettu tukipyyntöjärjestelmä.

**Roolit:**

1.  **Asiakas (Customer):** Voi luoda tukipyyntöjä ja nähdä _vain omat_ pyyntönsä.
2.  **Henkilökunta (Staff):** Voi nähdä kaikki pyynnöt, vastata niihin, sulkea pyyntöjä ja voi tarkastella audit-lokia.

**Toiminnallisuudet (MVP):**

- Kirjautuminen.
- Tukipyynnön luonti (otsikko, viesti).
- keskusteluketju tukipyynnön sisällä.
- Tilan hallinta (Open/Closed).
- Audit Dashboard (vain Staff – kuka teki ja mitä).

Sovelluksen domain-logiikka pidetään tarkoituksella yksinkertaisena, jotta projektin pääpaino voidaan pitää tietoturvaratkaisuissa.

## 4. Tietoturvakerrokset

Sovelluksessa toteutetaan useita tietoturvakerroksia:

1.  **Autentikaatio:** Käyttäjän tunnistautuminen toteutetaan NextAuth (Auth.js):n avulla.
    Kaikki suojatut rajapinnat tarkistavat istunnon ennen toiminnon suorittamista.
2.  **Autorisointi (RBAC):** Sovelluksessa käytetään roolipohjaista pääsynhallintaa. Customer: pääsee käsiksi vain omiin tukipyyntöihin, Staff: pääsee käsiksi kaikkiin tukipyyntöihin
3.  **Datan omistajuus:** Palvelin varmistaa, että asiakas voi hakea vain omia tukipyyntöjään. Tämä toteutetaan tarkistamalla tietokantakyselyissä createdByUserId ja estämällä muiden käyttäjien datan lukeminen. Tämän tarkoituksena on estää IDOR-haavoittuvuudet (Insecure Direct Object Reference).
4.  **Syötteiden validointi:** Kaikki palvelimelle saapuvat syötteet validoidaan Zod-skeemoilla ennen käsittelyä (Server Actions / mahdolliset API-endpointit). Tämä estää haitallisten syötteiden aiheuttamat ongelmat, kuten SQL-injektiot tai XSS-hyökkäykset.
5.  **Rate Limiting:** Palvelintason suojaus liiallisilta pyynnöiltä (esim. rekisteröinti, kirjautuminen, viestien lähetys) brute-force- ja DoS-yritysten rajoittamiseksi.
6.  **Audit Logging:** Turvallisuuskriittisten tapahtumien (esim. `AUTH_LOGIN_FAILED`, `TICKET_STATUS_CHANGED`, `TICKET_REPLY_POSTED`, `FORBIDDEN_ACTION_ATTEMPT`, ) kirjaaminen erilliseen tauluun. Audit-loki mahdollistaa järjestelmän tapahtumien jäljitettävyyden.
7.  **Turvallinen virheenkäsittely:** Sovellus palauttaa standardoituja virhetilanteita (401, 403, 404, 429) vuotamatta järjestelmän sisäisiä tietoja.

## 5. Arkkitehtuurin yleiskuva

Arkkitehtuuri noudattaa kerrosmalleja selkeyden ja testattavuuden varmistamiseksi:

1.  **UI Layer (Client):** React-komponentit, jotka vastaavat käyttöliittymästä.. Ei sisällä liiketoimintalogiikkaa.
2.  **Mutation Layer (Server Actions):** Vastaanottaa käyttöliittymästä tulevat mutaatiot (esim. ticketin luonti, viestin lähetys), suorittaa syötteiden validoinnin (Zod), autentikaation tarkistuksen sekä mahdollisen Rate Limiting -tarkistuksen ennen service-kerroksen kutsumista.
    Route Handlers -endpointeja käytetään vain tilanteissa, joissa tarvitaan erillinen HTTP-rajapinta (esim. Auth.js autentikaatioreitti).
3.  **Service Layer (Business Logic):**
    - Tarkistaa käyttöoikeudet (Permissions).
    - Suorittaa varsinaiset toiminnot (esim. `createTicket`).
    - Kutsuu tietokantakerrosta.
    - Kirjaa Audit-tapahtumat.
4.  **Data Access Layer:** Prisma ORM ja tietokantayhteys.

## 6. Arvioitu aikataulu

Projekti toteutetaan tiiviinä sprinttinä.

- **Vaihe 1: Projektin alustaminen**
  - Projektin pystytys, tietokantamallinnus (User, Ticket, Message, Audit).
  - Prisma + PostgreSQL konfigurointi
  - NextAuth-konfiguraatio ja roolit (Customer/Staff).
  - Testi käyttöliittymä

- **Vaihe 2: Ydinlogiikka**
  - Service-kerroksen toteutus (CRUD + permissions).
  - Viestiketjujen toteutus

- **Vaihe 3: Tietoturvakerrokset**
  - Zod-validointi
  - Rate Limiting
  - audit-lokin toteutus

  - Näkymät: Dashboard, Ticket Detail, New Ticket.
  - API-integraatio käyttöliittymään.

- **Vaihe 4: Käyttöliittymä**
  - Tukipyyntölista
  - Tukipyynnön näkymä
  - Uuden tukipyynnön luonti
  - Audit dashboard

- **Vaihe 5: Testaus ja Viimeistely**
  - Vitest-testien kirjoitus (painopisteenä tietoturvascenariot: onnistuuko Asiakas A näkemään Asiakkaan B lipun?).
  - Dokumentointi ja "siivous".

## 7. Alustava backlog / käyttäjätarinat

**MVP:**

- [USER] Asiakas voi kirjautua järjestelmään.
- [USER] Asiakas voi luoda uuden tukipyynnön.
- [USER] Asiakas näkee vain omat tukipyyntönsä
- [ADMIN] Henkilökunta näkee listauksen kaikista avoimista pyynnöistä, sekä suljetut.
- [ADMIN] Henkilökunta voi vastata pyyntöön ja sulkea sen.
- [SEC] Järjestelmä estää kirjautumattoman käytön (401).
- [SEC] Järjestelmä estää asiakasta näkemästä toisen asiakkaan lippua (403/404).
- [LOG] Epäonnistunut kirjautuminen tai oikeudeton yritys tallentuu audit-lokiin.

**Nice-to-have (jos aikaa jää):**

- Sähköposti-notifikaatiot. (Epätodennäköistä)
- Lippujen prioriteettitasot.
- Reaaliaikainen päivitys (polling tai websocket).

## 8. Arvosanatavoite

Tavoitteena on kiitettävä arvosana.

Tämä perustuu toteuttamalla:

- Selkeä tietoturva-arkkitehtuurin (Layered Security)
- Laadukkaaseen koodiin (TypeScript/Strict)
- Kirjoittamalla testejä tietoturvaskenaarioilla
- Dokumentoitu ja portfoliokelpoinen projekti

## 9. Riskit ja rajaukset

**Out of Scope:**
Rajataan projektin ulkopuolelle:

- Tiedostojen lataus (liitteet). (Alustavasti ennekuin MVP: valmis)
- Salasanan palautusmekanismit (käytetään yksinkertaista kirjautumista).
- Monimutkaiset hakutoiminnot.
- Reaaliaikainen chat. (Alustavasti)
- Ulkoasun hienosäätö (käytetään valmiita shadcn-komponentteja ajan säästämiseksi).

**Riskit:**
Aikataulu on tiukka projektin aloituksen viivästyksestä.

- Tietoturvaominaisuuksien (esim. oikea Rate Limiting) viritys voi viedä aikaa.
  - _Hallinta:_ Tiukka MVP-rajaus. Jos aika loppuu, "nice-to-have" -ominaisuudet jätetään pois.

## 10. Lopputuotokset

1.  **Toimiva sovellus:** Lähdekoodi GitHubissa.
2.  **Testiraportti:** Vitest-suoritukset, jotka todistavat tietoturvakontrollien toimivuuden (esim. `expect(response.status).toBe(403)`).
3.  **Dokumentaatio:** Asennusohjeet, arkkitehtuurikuvaus ja teknologiavalinnat (README).
