# Uni Manager

A personal website to manage my university life. Works on any device (phone, tablet, laptop).

Built with: **Next.js** (website) + **Supabase** (database and login) + **Tailwind CSS** (design).
Hosted free on: **Vercel**.

---

## 1. Requirements

### Sidebar
Dashboard, Schedule, Tasks, Courses (plus Sign out). On phones the sidebar becomes a bottom bar.

### Dashboard
- Table: **Today's schedule** (today's lectures from the week schedule, plus the upcoming exams table)
- Table: **Today's tasks** (tasks due today, overdue, or without a date)
- Table: **Assignments** (all open assignments)
- Latest notes
- A **+ Add** button at the top with a list: **+ Note**, **+ Recent Topic**, **+ Assignment** (and **+ Task**)

### Schedule
- Table 1: **Week schedule**, the full week (lectures, labs, sections with time and room)
- Table 2: **Exams** (date, time, course, room)
- The dashboard takes today's lectures from the week schedule and the exams from the exams table

### Tasks
- All tasks for all courses
- All assignments
- Filter by course, tick to complete, delete

### Courses
- List of all courses
- Open a course to see: **Recent topics**, **Tasks**, **Assignments**, **Completed** (finished tasks and assignments), **Notes**
- **Course materials**: add links (YouTube, Google Drive, or any website)

### Other
- Login with email and password. Every user only sees their own data.
- Responsive design.

---

## 2. Project structure

```
uni-manager/
├── app/
│   ├── layout.js            root layout
│   ├── globals.css          styles
│   ├── page.js              redirects to /dashboard
│   ├── login/page.js        login and sign up
│   └── (app)/               pages that need login
│       ├── layout.js        login check + sidebar
│       ├── dashboard/page.js
│       ├── schedule/page.js
│       ├── tasks/page.js
│       └── courses/
│           ├── page.js      all courses
│           └── [id]/page.js one course
├── components/
│   ├── Sidebar.jsx          sidebar / bottom bar
│   ├── AddMenu.jsx          the "+ Add" dropdown
│   ├── AddModal.jsx         all "add" forms (course, note, topic, task, ...)
│   ├── ItemTable.jsx        table for tasks and assignments
│   ├── Modal.jsx
│   └── ui.jsx               Card, PageHeader, due-date badge
├── lib/
│   ├── supabase.js          database connection
│   ├── helpers.js           dates, days, sorting
│   └── db.js                tick / delete helpers
├── supabase/schema.sql      database tables (run once)
├── .env.example             names of the secret settings
├── package.json
└── README.md
```

Database tables: `courses`, `lectures`, `exams`, `tasks`, `assignments`, `topics`, `notes`, `materials`.

---

## 3. Step-by-step setup (beginner)

### Step 1: Install tools (once)
1. **Node.js** (LTS version): https://nodejs.org
2. **Git**: https://git-scm.com
3. **VS Code** (optional editor): https://code.visualstudio.com

### Step 2: Create the free database (Supabase)
1. Go to https://supabase.com and sign up (GitHub login is easiest).
2. Click **New project**. Choose a name and a database password (save it), pick the closest region, click **Create**. Wait about 2 minutes.
3. In the left menu open **SQL Editor** -> **New query**.
4. Open `supabase/schema.sql` from this project, copy everything, paste it, click **Run**. It should say "Success".
5. Left menu -> **Authentication** -> **Providers** -> **Email**. Turn **OFF** "Confirm email" and save. (This lets you log in right after signing up. You can turn it on later.)
6. Left menu -> **Project Settings** -> **API** (or **Data API**). Keep this page open. You need:
   - **Project URL**
   - **anon / public key** (the long key labeled "anon" or "publishable"). Do NOT use the "service_role" key.

### Step 3: Run it on your computer
1. Unzip the project and open the folder in VS Code.
2. Copy `.env.example` and rename the copy to `.env.local`. Fill it:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-long-anon-key
   ```
3. Open the terminal in VS Code (**Terminal -> New Terminal**) and run:
   ```
   npm install
   npm run dev
   ```
4. Open http://localhost:3000, click **Sign up**, create your account, and add your first course.

### Step 4: Put the code on GitHub
1. Create a free account at https://github.com.
2. Click **+ -> New repository**. Name it `uni-manager`, keep it **Private**, do NOT add a README, click **Create repository**.
3. In the VS Code terminal run (replace YOUR-USERNAME):
   ```
   git init
   git add .
   git commit -m "first version"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/uni-manager.git
   git push -u origin main
   ```
   If it asks you to log in, follow the browser window it opens.
   `.env.local` is listed in `.gitignore`, so your keys are NOT uploaded.

### Step 5: Publish on Vercel (free)
1. Go to https://vercel.com and sign up with **Continue with GitHub**.
2. Click **Add New -> Project**, find `uni-manager`, click **Import**.
3. Open **Environment Variables** and add two variables:
   - Name `NEXT_PUBLIC_SUPABASE_URL`, value: your Project URL
   - Name `NEXT_PUBLIC_SUPABASE_ANON_KEY`, value: your anon key
4. Click **Deploy** and wait about a minute.
5. You get a link like `https://uni-manager-xxxx.vercel.app`. Open it on any device.

### Step 6: Tell Supabase your live link
In Supabase -> **Authentication** -> **URL Configuration**:
- **Site URL**: your Vercel link
- **Redirect URLs**: add `https://your-link.vercel.app/**` and `http://localhost:3000/**`

### Step 7: Use it like an app on your phone
- **Android (Chrome):** menu (three dots) -> **Add to Home screen**
- **iPhone (Safari):** Share button -> **Add to Home Screen**

### Updating the website later
Change the code, then run:
```
git add .
git commit -m "what I changed"
git push
```
Vercel updates the live site automatically in about a minute.

---

## 4. Troubleshooting

| Problem | Fix |
|---|---|
| Blank page / "Invalid API key" online | The two Environment Variables in Vercel are missing or wrong. Fix them, then Deployments -> Redeploy |
| "relation does not exist" error | You did not run `schema.sql` in Supabase |
| Sign up says "check your email" and no email comes | Turn off "Confirm email" (Step 2.5) or check spam |
| Build fails on Vercel | Open the failed deployment, copy the red error text, and paste it to an AI together with the file it mentions |
| Supabase project paused | Free projects pause after inactivity. Open the Supabase dashboard and click **Restore** |
| Week starts on the wrong day | Change `DAY_ORDER` in `lib/helpers.js` |

## 5. Ideas for later
Calendar view, dark mode, file uploads, notifications, GPA/grades page, PWA icon.
