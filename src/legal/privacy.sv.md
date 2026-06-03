# Integritetspolicy

_Senast uppdaterad: 27 mars 2026_

> Detta är en svensk översättning av vår integritetspolicy. Vid eventuella avvikelser gäller den [engelska originalversionen](/en/privacy).

Denna integritetspolicy beskriver hur LucrAI Tech AB samlar in, använder och skyddar dina personuppgifter när du använder vår AI-drivna B2B-SaaS-plattform. Policyn är utformad för att följa dataskyddsförordningen (GDPR) och tillämplig svensk dataskyddslagstiftning (Dataskyddslagen 2018:218).

## Introduktion

Lucra AI är en AI-plattform utformad för företag och redovisningskonsulter för att hantera ekonomiska dokument, analysera data och effektivisera redovisningsflöden. Plattformen är uteslutande avsedd för användning mellan företag (B2B).

### Personuppgiftsansvarig

Personuppgiftsansvarig för de personuppgifter som behandlas via plattformen är:

- LucrAI Tech AB
- Sverige, EU
- E-post: [privacy@lucra.ai](mailto:privacy@lucra.ai)

Denna integritetspolicy gäller alla användare av Lucra AI-plattformen, inklusive vår webbapplikation och relaterade tjänster. Genom att använda våra tjänster bekräftar du att du har läst och förstått denna policy.

## Uppgifter vi samlar in

Vi samlar in följande kategorier av personuppgifter:

### Kontouppgifter

- Fullständigt namn och e-postadress
- Lösenord (lagras endast i hashad form med bcrypt; vi lagrar aldrig och har aldrig tillgång till ditt lösenord i klartext)
- Företagsnamn och tilldelad roll inom organisationen

### Filer och dokument

- Ekonomiska dokument du laddar upp, inklusive PDF-, DOCX-, TXT- och SIE-filer (svenskt standardformat för bokföring)
- Filmetadata: filnamn, storlek, MIME-typ, SHA-256-kontrollsumma och uppladdningsdatum

### AI-interaktionsdata

- Chattmeddelanden och frågor som skickas till vår AI-assistent
- AI-genererade svar och analysresultat
- Konversationshistorik och kontext

### Fortnox-integrationsdata (valfritt)

Om du väljer att koppla ditt Fortnox-konto får vi åtkomst till och behandlar data från Fortnox för din räkning, inklusive fakturor, leverantörsfakturor, lönetransaktioner, verifikat, räkenskapsår och företagsinformation. Anslutningen upprättas via OAuth 2.0 och kan återkallas när som helst.

### Teknisk data

- IP-adress, webbläsartyp och operativsystem (samlas in automatiskt av vår felövervakningstjänst i händelse av fel)
- Åtkomsttidsstämplar

## Hur vi använder dina uppgifter

Vi behandlar dina personuppgifter för följande ändamål, vart och ett med en rättslig grund enligt GDPR:

### Tillhandahållande av tjänsten (fullgörande av avtal — art. 6.1 b)

- Tillhandahålla och underhålla vår AI-plattform och dess funktioner
- Behandla och analysera dina uppladdade dokument
- Generera AI-drivna insikter och svar på dina frågor
- Hantera ditt konto och din autentisering
- Skicka tjänstrelaterade aviseringar (lösenordsåterställning, konversationsinbjudningar)

### Plattformens stabilitet (berättigat intresse — art. 6.1 f)

- Övervaka systemets hälsa och upptäcka fel via vår felspårningstjänst
- Förhindra missbruk och säkerställa plattformens säkerhet

## AI-databehandling

Våra AI-funktioner behandlar dina uppgifter för att tillhandahålla intelligent dokumentanalys, ekonomiska insikter och konversationsassistans. Vi vill vara transparenta med hur detta fungerar:

- **Dina uppgifter används inte för att träna AI-modeller.** De dokument du laddar upp och de konversationer du har med vår AI behandlas enbart för att tillhandahålla den begärda tjänsten. Vi använder inte dina uppgifter för att träna, finjustera eller förbättra allmänna AI-modeller.
- Dina dokument tolkas, delas upp i segment och konverteras till vektorinbäddningar för semantisk sökning. Dessa inbäddningar lagras i en vektordatabas och används för att ge relevant kontext när du ställer frågor till AI-assistenten.
- Chattmeddelanden och dokumentinnehåll skickas till OpenAI (vår tredjepartsleverantör av AI) för behandling. OpenAI är avtalsmässigt förbjudet att använda dina uppgifter för egna träningsändamål.
- AI-genererade resultat (analysresultat, sammanfattningar, svar) lagras som en del av din konversationshistorik och omfattas av samma lagrings- och raderingspolicy som övriga uppgifter.

## Lagring och spårningsteknik

Vi använder för närvarande webbläsarens lokala lagring (local storage) och liknande tekniker för att stödja autentisering och plattformens kärnfunktioner. Vi kan komma att använda ytterligare tekniker på klientsidan, inklusive cookies, i framtiden och kommer att uppdatera denna integritetspolicy vid behov.

### Webbläsarens lokala lagring

Vi lagrar autentiseringstokens (JWT) i din webbläsares lokala lagring för att hålla dig inloggad. Dessa tokens innehåller ditt användar-ID, din roll och din e-post och krävs för att plattformen ska fungera. De tas bort när du loggar ut.

### Tredjepartsresurser

Vår plattform laddar typsnitt från Google Fonts, vilket kan medföra att din webbläsare gör förfrågningar till Googles servrar. Google kan samla in teknisk data (IP-adress, webbläsarinformation) via dessa förfrågningar, i enlighet med [Googles integritetspolicy](https://policies.google.com/privacy).

### Felövervakning

Vår felövervakningstjänst (Sentry) kan sätta egna cookies eller poster i lokal lagring för att spåra felsessioner. Dessa uppgifter används enbart för att diagnostisera tekniska problem och används inte för annonsering eller profilering av användare.

## Datadelning och underbiträden

Vi säljer inte dina personuppgifter. Vi delar uppgifter med följande kategorier av tjänsteleverantörer, var och en bunden av personuppgiftsbiträdesavtal:

### Underbiträden

- **Amazon Web Services (AWS)** — EU (Stockholm, eu-north-1). Leverantör av molninfrastruktur och hosting som används för applikationshosting, fillagring, databaser, loggning, innehållsleverans, e-postleverans och relaterad teknisk drift.
- **OpenAI, LLC** — USA. Leverantör av AI-modeller för chattkompletteringar och dokumentanalys. Dina chattmeddelanden och ditt dokumentinnehåll skickas till OpenAI för behandling.
- **Functional Software, Inc. (Sentry)** — EU (Tyskland). Felövervakning och prestandaspårning av applikationer. Tar emot felrapporter med teknisk kontext.
- **Fortnox AB** — Sverige. Integration med bokföringsprogram (endast när du uttryckligen kopplar ditt Fortnox-konto via OAuth).

### Rättsliga skyldigheter

Vi kan lämna ut dina uppgifter när det krävs enligt lag, förordning eller rättsligt förfarande, eller för att skydda Lucra AI:s, våra användares eller andras rättigheter, säkerhet eller egendom.

### Verksamhetsöverlåtelser

I händelse av en fusion, ett förvärv eller en försäljning av tillgångar kan dina uppgifter komma att överföras som en del av den transaktionen. Vi kommer att informera dig om en sådan förändring och säkerställa att dina uppgifter förblir skyddade enligt likvärdiga villkor.

## Lagringstid

Vi sparar dina personuppgifter endast så länge som är nödvändigt för att uppfylla de ändamål som beskrivs i denna policy:

- **Kontouppgifter** sparas under den tid ditt konto är aktivt. När kontot raderas tas dina profiluppgifter, autentiseringstokens och Fortnox-kopplingar bort permanent.
- **Uppladdade dokument** sparas medan ditt konto är aktivt. Du kan radera enskilda filer när som helst via plattformen, vilket tar bort både filen från lagringen och dess vektorinbäddningar. När kontot raderas tas dina uppladdade dokument och tillhörande vektorinbäddningar bort permanent, med förbehåll för eventuella lagstadgade lagringsskyldigheter.
- **Konversationshistorik** sparas medan ditt konto är aktivt. När kontot raderas tas innehållet i dina chattmeddelanden bort från plattformen.
- **Rättsliga och ekonomiska handlingar** som rör Lucra AI:s egen verksamhet (såsom faktureringsunderlag, i förekommande fall) kan sparas i upp till 7 år enligt bokföringslagen (1999:1078).

## Internationella överföringar

LucrAI Tech AB är baserat i Sverige inom EU/EES. Dina uppgifter lagras och behandlas huvudsakligen inom EU/EES-regionen (AWS eu-north-1, Stockholm).

Vissa uppgifter överförs dock till USA för behandling av OpenAI (vår leverantör av AI-modeller). För dessa överföringar förlitar vi oss på följande skyddsåtgärder:

- Dataskyddsramverket mellan EU och USA (EU-U.S. Data Privacy Framework), där mottagaren är certifierad
- Standardavtalsklausuler (SCC) godkända av Europeiska kommissionen
- Ytterligare tekniska och organisatoriska åtgärder för att skydda dina uppgifter under överföringen

## Datasäkerhet

Vi vidtar lämpliga tekniska och organisatoriska åtgärder för att skydda dina personuppgifter, bland annat:

- Lösenord lagras i hashad form med branschstandardiserade säkerhetsrutiner och lagras aldrig i klartext
- All data under överföring krypteras med TLS
- Filer lagras i AWS S3 med kryptering på serversidan
- Autentisering använder kortlivade JWT-åtkomsttokens med separata refresh-tokens
- Rollbaserad åtkomstkontroll begränsar dataåtkomst utifrån användarroller
- Filmetadata, inklusive SHA-256-kontrollsummor, används för att hjälpa till att upptäcka dubbletter vid uppladdning och stödja filhantering

## Anmälan av personuppgiftsincidenter

I händelse av en personuppgiftsincident som sannolikt leder till en risk för dina rättigheter och friheter kommer vi att:

- Anmäla incidenten till Integritetsskyddsmyndigheten (IMY) inom 72 timmar från det att vi fått kännedom om den, i enlighet med artikel 33 i GDPR
- Informera berörda användare utan onödigt dröjsmål om incidenten sannolikt leder till en hög risk för deras rättigheter och friheter, i enlighet med artikel 34 i GDPR
- Dokumentera incidenten, dess effekter och de åtgärder som vidtagits

## Dina rättigheter

Enligt dataskyddsförordningen har du följande rättigheter avseende dina personuppgifter:

- **Rätt till tillgång (art. 15)** — Du kan begära en kopia av de personuppgifter vi har om dig.
- **Rätt till rättelse (art. 16)** — Du kan be oss att korrigera felaktiga eller ofullständiga personuppgifter.
- **Rätt till radering (art. 17)** — Du kan begära att dina personuppgifter raderas, med förbehåll för lagstadgade lagringskrav.
- **Rätt till begränsning (art. 18)** — Du kan be oss att begränsa behandlingen av dina uppgifter under vissa omständigheter.
- **Rätt till dataportabilitet (art. 20)** — Du kan få dina personuppgifter i ett strukturerat, allmänt använt och maskinläsbart format.
- **Rätt att göra invändningar (art. 21)** — Du kan invända mot behandling som grundar sig på berättigat intresse.

För att utöva någon av dessa rättigheter, kontakta oss på [privacy@lucra.ai](mailto:privacy@lucra.ai). Vi besvarar din begäran inom 30 dagar.

Om du anser att dina dataskyddsrättigheter har kränkts har du rätt att lämna in ett klagomål till Integritetsskyddsmyndigheten (IMY) på [www.imy.se](https://www.imy.se).

## Barns integritet

Lucra AI är en B2B-plattform som inte är avsedd att användas av personer under 18 år. Vi samlar inte medvetet in personuppgifter från barn. Om vi får kännedom om att vi har samlat in personuppgifter från ett barn under 18 år kommer vi att vidta åtgärder för att radera dessa uppgifter utan dröjsmål.

## Ändringar och kontakt

Vi kan komma att uppdatera denna integritetspolicy från tid till annan för att återspegla förändringar i vår verksamhet, rättsliga krav eller plattformens funktioner. När vi gör väsentliga ändringar meddelar vi dig via plattformen eller via e-post minst 14 dagar innan ändringarna träder i kraft.

### Kontakta oss

Om du har frågor om denna integritetspolicy eller vill utöva dina dataskyddsrättigheter, kontakta oss:

- E-post: [privacy@lucra.ai](mailto:privacy@lucra.ai)
- Företag: LucrAI Tech AB
- Plats: Sverige, EU
