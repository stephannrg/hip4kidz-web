# Hip4Kidz Platform — Web (verbindingstest)

Minimale Vite + React app die alleen test of Netlify ↔ Supabase goed
verbonden zijn. Nog geen echte functionaliteit — dat komt in latere
stappen (H4K-dashboard, ouder-portal, klant-portal).

## Lokaal draaien (optioneel, om te testen vóór deploy)

```bash
npm install
cp .env.example .env
# vul VITE_SUPABASE_ANON_KEY in (Supabase Settings > API > anon/public key)
npm run dev
```

## Naar GitHub

```bash
git init
git add .
git commit -m "Eerste opzet: Netlify + Supabase verbindingstest"
```

Maak daarna een nieuwe, LEGE repository aan op github.com (geen README/
.gitignore aanvinken, die heb je al), en volg de instructies die GitHub
toont onder "…or push an existing repository from the command line":

```bash
git remote add origin https://github.com/JOUW-GEBRUIKERSNAAM/hip4kidz-web.git
git branch -M main
git push -u origin main
```

## Naar Netlify

1. Ga naar app.netlify.com → "Add new site" → "Import an existing project"
2. Kies GitHub, autoriseer indien gevraagd, selecteer de `hip4kidz-web` repo
3. Build-instellingen worden automatisch overgenomen uit `netlify.toml`
   (build command: `npm run build`, publish directory: `dist`) — hoef je
   niks aan te veranderen
4. **Voordat je op "Deploy" klikt**: ga naar "Show advanced" → "New
   variable" en voeg toe:
   - `VITE_SUPABASE_URL` = `https://jcnhyoptcezlkmcneagw.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (je anon key uit Supabase Settings > API)
5. Klik "Deploy site"

Na een paar minuten krijg je een URL zoals `https://iets-random.netlify.app`.
Open die — je zou 4 regels moeten zien met ✅, waarvan de laatste
("RLS-bescherming actief") bevestigt dat een anonieme bezoeker terecht
GEEN data te zien krijgt. Dat is het gewenste resultaat, geen fout.

## Wat betekenen de 4 checks?

- **Environment variables geladen** — Netlify heeft de env vars correct doorgegeven aan de build
- **Supabase-client aangemaakt** — de URL/key hebben het juiste formaat
- **Supabase Auth bereikbaar** — er is daadwerkelijk netwerkcontact met Supabase
- **RLS-bescherming actief** — een niet-ingelogde bezoeker krijgt terecht 0 rijen data, wat bevestigt dat de database goed beveiligd is
