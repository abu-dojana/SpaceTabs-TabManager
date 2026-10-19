# Chrome Web Store Publishing & Review Approval Guide

> This comprehensive guide provides step-by-step instructions to register as a Chrome Web Store developer, package the extension, pass Google's review on the first attempt, and set up your Patreon monetization with Payoneer payouts.

---

## 1. Chrome Web Store Developer Registration

1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Sign in with your Google Account.
3. Pay the **one-time \$5 USD registration fee**.
   > [!NOTE]
   > You can pay this \$5 registration fee using a Visa/Mastercard debit or credit card, or your **Payoneer Prepaid Mastercard**.
4. Complete your Developer Profile (Developer Name, Contact Email, Website or GitHub URL).

---

## 2. Packaging SpaceTabs for Upload

WXT provides an automated command to generate a production-ready, clean `.zip` archive for Chrome Web Store:

1. Open PowerShell in `D:\tab-manager`:
   ```powershell
   npm run zip
   ```
2. This creates a zip file inside `.output/`:
   ```
   D:\tab-manager\.output\spacetabs-1.0.0-chrome.zip
   ```
3. This `.zip` file is what you will upload directly to the Chrome Developer Dashboard.

---

## 3. Chrome Web Store Policy Compliance & Review Strategy

Google's review team checks extensions against three primary policies:
1. **Single Purpose Policy** (The extension must have a single, clearly defined function).
2. **Permission Justification** (Every permission in `manifest.json` must have a legitimate, necessary reason).
3. **User Data & Privacy Policy** (A hosted Privacy Policy URL is mandatory).

### A. Single Purpose Statement
When filling out the store listing, specify the Single Purpose:
> *"SpaceTabs is a tab and workspace manager that organizes browser tabs into dedicated spaces, suspends inactive tabs to save memory, and syncs workspace data to the user's personal Google Drive."*

---

### B. Exact Permissions Justifications (Copy & Paste for Reviewers)

When you submit the extension, the Developer Dashboard will ask: **"Why does your extension need each of the following permissions?"**
Use these exact justifications to ensure smooth approval:

#### 1. Permission: `tabs`
* **Justification to enter:**
  > *"Required to read open tab URLs and titles in order to group them into user workspaces (Spaces), switch window tab sets when switching spaces, and reorder tabs according to user preferences."*

#### 2. Permission: `storage`
* **Justification to enter:**
  > *"Required to persist user preferences (theme, dark/light mode palette, sidebar width, auto-suspension idle threshold, whitelist domains, and Patreon creator link) locally in the browser."*

#### 3. Permission: `alarms`
* **Justification to enter:**
  > *"Required to run periodic background checks that detect inactive tabs exceeding the user's configured idle threshold (e.g. 15 or 30 minutes) and trigger memory-saving tab suspension, as well as periodic cloud sync checks."*

#### 4. Permission: `identity`
* **Justification to enter:**
  > *"Required to authenticate the user with their personal Google Account via Chrome's native OAuth2 system to allow optional, encrypted backup and synchronization of workspace data directly to the user's Google Drive."*

#### 5. Permission: `favicon`
* **Justification to enter:**
  > *"Required to display high-resolution website favicons inside the SpaceTabs workspace dashboard, helping users visually identify open and saved tabs."*

---

### C. Host Permissions Justification
* **Hosts Requested:** `https://www.googleapis.com/*`
* **Justification to enter:**
  > *"Required to make authenticated REST API calls to the Google Drive API (drive.file scope) to create and sync the SpaceTabs_Data backup file inside the user's personal Google Drive folder."*

---

## 4. Privacy Practices Tab Answers

In the Chrome Developer Dashboard, navigate to the **Privacy** tab:

1. **Single Purpose Compliance:** Check **Yes**.
2. **Permission Justification:** Paste the justifications from Section 3B above.
3. **Data Usage Disclosures:**
   - **Personally Identifiable Information (PII):** Check **Yes** (Reason: Google user profile email and name are read solely to display the logged-in user in the sync status UI).
   - **Website Content:** Check **Yes** (Reason: Tab titles and URLs are stored strictly to manage tabs in spaces).
   - **Authentication Information:** Check **Yes** (Reason: OAuth token for Google Drive sync).
4. **Data Usage Certifications:**
   - Check: *"I confirm that data is not sold to third parties."*
   - Check: *"I confirm that data is not used or transferred for purposes unrelated to the extension's core functionality."*
   - Check: *"I confirm that data is not used for creditworthiness or lending purposes."*
5. **Privacy Policy URL:** Paste your hosted Privacy Policy URL (see Section 6).

---

## 5. Google Cloud Console OAuth Verification

Because SpaceTabs connects to Google Drive, you need to publish your OAuth Consent Screen:

1. Open [Google Cloud Console](https://console.cloud.google.com).
2. Go to **APIs & Services > OAuth consent screen**.
3. **Scopes Requested:** Verify that you are ONLY requesting `https://www.googleapis.com/auth/drive.file`, `userinfo.email`, and `userinfo.profile`.
   > [!IMPORTANT]
   > The `drive.file` scope is classified by Google as **Non-Sensitive** or **Recommended** because it only allows the extension to access files *it created itself*. It does NOT require a costly third-party security audit!
4. **Publishing Status:** Click **"Publish App"** to move from "Testing" mode to "In Production". Once in production, any user from the Chrome Web Store can sign in with their Google account without being added to a manual tester list.
5. In the Chrome Client ID:
   - Once your extension is published to the Chrome Web Store, copy the final Web Store Extension ID and ensure it is registered in your Google Cloud Console Credentials.

---

## 6. How to Host Your Privacy Policy for Free

A public Privacy Policy URL is **mandatory** for Chrome Web Store approval. You can host our provided `privacy_policy.md` in less than 2 minutes using any of these free options:

### Option A: GitHub Pages (Recommended)
1. In your GitHub repository, create a file named `privacy-policy.md` or `index.html`.
2. Go to **Settings > Pages** and enable GitHub Pages on the `main` branch.
3. Your privacy policy URL will be: `https://yourusername.github.io/tab-manager/privacy-policy`

### Option B: Google Sites
1. Go to [Google Sites](https://sites.google.com).
2. Create a blank page, paste the contents of `privacy_policy.md`, and click **Publish**.
3. Paste the published URL into the Chrome Web Store dashboard.

---

## 7. Store Listing Assets Checklist

Prepare the following assets for the **Store Listing** tab:

| Asset | Specifications | Purpose |
| :--- | :--- | :--- |
| **Extension Icon** | 128 x 128 px PNG | Extension avatar on the store (`dist/icon-128.png`) |
| **Small Promo Tile** | 440 x 280 px PNG/JPEG | Store search result banner |
| **Screenshots** | 1280 x 800 px PNG/JPEG | Minimum 1 screenshot (maximum 5) showing Dashboard, Notes, Tasks, and Themes |
| **Short Description** | Maximum 132 characters | *"Unlimited spaces, tab manager, memory saver, and Google Drive cloud sync. Workona-style workspace without limits."* |
| **Category** | *Productivity* | Primary store categorization |

---

## 8. Setting Up Patreon with Payoneer Payouts

Since platforms like *Buy Me a Coffee* or *Stripe* are unavailable in certain countries, **Patreon + Payoneer** is the standard, globally accepted solution for developers to receive international donations.

### Why Patreon + Payoneer Works Globally
* Patreon supports creator payouts via **Payoneer Bank Transfer** to local bank accounts in over 190 countries (including Bangladesh, India, Pakistan, Nigeria, Egypt, and Latin America).
* Low payout threshold (\$25) and direct transfer to your local currency.

### Step-by-Step Setup:
1. **Create a Patreon Creator Page:**
   - Go to [Patreon.com](https://www.patreon.com) and click **"Create on Patreon"**.
   - Set up your profile: Name it **"SpaceTabs"** or your Developer Name.
   - Choose your currency (USD is recommended).
2. **Connect Payoneer:**
   - In Patreon, navigate to **Settings > Billing and Payouts > Payout Method**.
   - Select **Payoneer**.
   - You will be redirected to Payoneer to link your existing Payoneer account. Click **"Already have a Payoneer account? Sign in"**.
   - Authorize Patreon to deposit earnings directly into your Payoneer balance.
3. **Get Your Public Patreon Link:**
   - Your public link will look like: `https://www.patreon.com/spacetabs` (or your creator username).
4. **Insert Your Link into SpaceTabs:**
   - Open SpaceTabs Dashboard.
   - Click **Settings (gear icon) > About**.
   - In the **Support SpaceTabs on Patreon** card, paste your custom Patreon URL into the input field and click **Save**.
   - Clicking **"Support on Patreon"** in the sidebar footer or settings will now instantly open your personal creator page!

---

## 9. Review Timeline & Future Updates

* **Initial Review:** Google usually reviews new extensions within **24 to 72 hours**.
* **Review Status Notifications:** You will receive an automated email from `cws-developer-support@google.com` once your extension is approved and live on the store.
* **Publishing Future Updates:**
  1. Increment `"version": "1.0.1"` in `package.json`.
  2. Run `npm run zip`.
  3. Go to the Developer Dashboard, click your extension, and click **"Package > Upload updated package"**.
  4. Submit for review. Updates typically approve faster (often within 12–24 hours).
