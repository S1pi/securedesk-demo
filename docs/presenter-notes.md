# SecureDesk - esittäjän muistiinpanot

Tämän tiedoston tarkoitus on auttaa puhumaan luonnollisesti Zoom-esityksessä.

Pidä esitys rytmissä:

selitys → demo → selitys → demo

Älä yritä selittää kaikkea toteutusta tai jokaista tiedostoa.

**Demoa varten tunnarit:**

- customer: testcustomer@gmail.com / Testi123456!
- staff: staff@securedesk.fi / Testi123456!

### Zoom-vinkki:

Kun esittelet tietoturvakerrokset, pysähdy hetkeksi niiden listaan.
Älä skrollaa heti eteenpäin, jotta yleisö ehtii nähdä rakenteen.

## Zoom-demo vinkit

- Pida vain valttamattomat ikkunat auki.
- Kirjaudu testikayttajilla valmiiksi tai pidä tunnukset helposti saatavilla.
- Jos live-triggerointi vie liikaa aikaa, nayta valmiiksi syntyneet audit-lokirivit.
- Pida fonttikoko riittavan suurena ruudunjakoa varten.

## Suositeltu rakenne (15 min)

0:00–2:00 → projektin idea  
2:00–3:00 → nopea sovellusdemo  
3:00–6:00 → tietoturvakerrokset  
6:00–10:00 → arkkitehtuuripäätökset + demo esimerkkejä  
10:00–12:00 → teknologiat ja oppiminen  
12:00–15:00 → lyhyt demo + yhteenveto

## 1. Projektin idea

Pääajatus:

Tämän projektin päätarkoitus ei ollut rakentaa monimutkaista asiakaspalvelujärjestelmää.

Tarkoitus oli demonstroida, miten useita tietoturvakerroksia voidaan rakentaa moderniin web-sovellukseen.

Sovellus on tarkoituksella yksinkertainen, jotta arkkitehtuuri ja turvakerrokset näkyvät selkeästi.

Voit sanoa esimerkiksi:

"Halusin tehdä pienen mutta aidon sovelluksen, jossa päänäkymä ei ole business-logiikka vaan kerroksellinen tietoturva."

"Sovellus toimii ympäristönä, jossa voidaan näyttää eri tietoturvakerrokset käytännössä."

## 2. Sovelluksen yleiskuva

Näytä sovellus nopeasti.

Pääajatus:

SecureDesk on yksinkertainen ticket-järjestelmä.

Siinä on kaksi roolia:

- customer
- staff

Yksinkertainen domain oli tietoinen valinta.
Mutta se riittää näyttämään, miten omistajuus, RBAC ja audit logging toimivat käytännössä.
Uusien roolien tai toimintojen lisääminen on helppoa, koska arkkitehtuuri on suunniteltu laajennettavaksi.

Mitä kannattaa sanoa:

"Customer voi luoda tukipyyntöjä ja nähdä vain omansa."

"Staff voi nähdä kaikki pyynnöt, vastata niihin, muuttaa tilaa ja katsoa audit-lokia."

## 3. Tietoturva-arkkitehtuuri

Pääajatus:

Sovelluksessa ei luoteta yhteen suojaan.

Suoja perustuu useaan toisistaan riippumattomaan kerrokseen.

Nosta esiin kerrokset:

- rate limiting
- input validation
- authentication
- authorization
- data access enforcement
- safe error handling
- audit logging

Hyvä tiivistys:

"Yksittäinen suoja ei riitä. Siksi sovellus käyttää useita toisistaan riippumattomia tietoturvakerroksia."

Voit sanoa:

"Ajatus on defense in depth. Jos yksi kerros pettää, muut kerrokset jäävät vielä suojaamaan sovellusta."

## 4. Keskeiset tietoturvapaatokset

### RBAC ja omistajuus

Näytä sovelluksessa roolien ero.

- Roolit määrittää, mitä käyttäjä saa tehdä.
- Customer ei saa nahda toisen asiakkaan ticketia.
- Tietokantakyselyt rajataan omistajuuden mukaan.

### Ownership enforcement

Avaa ticket-näkymä.

Selitä:

customer näkee vain omat ticketit.

Voit sanoa:

"Yksi keskeinen päätös oli siirtää oikea suoja palvelinpuolelle ja mahdollisimman lähelle datan hakua."

### 404 omistajuusvirheissa

Voit sanoa:

"Toisen asiakkaan ticketista ei palauteta tarkkaa forbidden-viestiä."

"Ulospäin palautetaan 404, jotta ticketin olemassaoloa ei paljasteta."

"Tämä estää resurssien enumerointia."

### Turvallinen virheenkasittely

- Käyttäjälle ei näytetä sisäisiä virheitä.
- Virheviestit ovat turvallisia ja hallittuja.

### Audit logging

Näytä audit-loki.

Selitä:

- epäonnistuneet kirjautumiset
- forbidden-attemptit
- rate limit -osumat

Voit sanoa:

"Audit-loki ei ole vain debuggausta varten, vaan osa tietoturvavalvontaa. Helpottaa mahdollisissa selvityksissä"

### Server Actions

Voit sanoa:

"Sisäiset mutaatiot toteutettiin Server Actionseilla."

"Tarkoitus oli välttää tarpeettoman laaja julkinen REST-pinta."

"Tämä pienentää attack surfacea."

## 5. Käytetyt teknologiat

Pääajatus:

Teknologiat valittiin tukemaan modernia server-side toteutusta ja tietoturvaa.

Nosta esiin:

- Next.js
- TypeScript
- Prisma ORM
- PostgreSQL
- Auth.js / NextAuth
- Zod
- Server Actions

Voit sanoa:

"Teknologiat eivät olleet vain lista kirjastoja, vaan jokaisella oli selkeä rooli arkkitehtuurissa."

## 6. Mitä opin projektin aikana

Tämä on tärkeä kurssin kannalta.

Korosta:

- kerroksellinen sovellustietoturva
- Prisma ORM ensimmäistä kertaa kunnolla
- Auth.js / NextAuth autentikaatio
- parempi Next.js projektirakenne
- AI-tyokalujen ja agenttien tehokkaampi kayttö paremmilla ohjeilla ja dokumentaatiolla (copilot-instructions)

Mita kannattaa sanoa:

- "Yksi projektin isoimmista tavoitteista oli oppia uusia teknologioita ja parempia kehityskäytäntöjä."
- "Erityisesti tietoturva-arkkitehtuurin hahmottaminen kokonaisuutena syveni paljon projektin aikana."
- "Opin myos kayttamaan AI-tyokaluja tavoitteellisemmin kirjoittamalla niille selkeampia ohjeita ja dokumentaatiota."

## 7. Demo

Näytä vain muutama selkeä asia:

1. kirjautuminen
2. roolien erot
3. ticket-näkymä
4. audit-loki

Korosta:

"Tärkeää ei ole sovelluksen monimutkaisuus."

"Vaan se miten tietoturvakerrokset on rakennettu."

## Lopetus

Hyvä viimeinen viesti:

"Tämä projekti ei ollut ennen kaikkea ticket-sovellus."

"Se oli harjoitus siitä, miten moderniin web-sovellukseen rakennetaan useita toisiaan tukevia tietoturvakerroksia."
