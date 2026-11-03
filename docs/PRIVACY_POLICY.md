# Privacy Policy for SpaceTabs — Tab Manager

**Last Updated:** November 3, 2026

SpaceTabs ("we", "our", or "the extension") is committed to protecting your privacy. This Privacy Policy describes how your information is handled when you use the SpaceTabs Chrome Extension.

SpaceTabs is designed with a **strict local-first architecture**. We do not operate external tracking servers, we do not sell your personal data, and we do not monitor your browsing behavior.

---

## 1. Information We Collect and Process

SpaceTabs only processes data necessary to provide its core tab and workspace management functionality:

* **Tab URLs and Page Titles:** When you open tabs, save tabs, or organize spaces, SpaceTabs reads the URLs, page titles, and favicons of those tabs. This information is stored **locally on your device** inside your browser's IndexedDB database.
* **Workspace Content:** Notes, task checklists, and resource bookmarks you create inside SpaceTabs are stored on your local computer. Unsaved browsing sessions (including their open tabs, notes, tasks, and resources) remain strictly local on your device and are never uploaded to Google Drive.
* **User Preferences & Session State:** Custom settings such as theme choices, dark/light mode palettes, sidebar width, auto-suspension idle thresholds, and creator support links, along with sync metadata/tombstones and per-window session bindings, are saved locally using Chrome's `storage.local` and `storage.session` APIs.
* **Google Account Profile Information (Optional):** If you choose to enable Google Drive Cloud Sync, the extension receives your basic profile information (name, email address, and avatar image) via Google's OAuth2 userinfo endpoint (`https://www.googleapis.com/oauth2/v2/userinfo`) solely to display your connected account status in the user interface.

---

## 2. Where Your Data is Stored

1. **Local Storage (Primary):** All your spaces, tabs, notes, tasks, resources, and settings are stored locally in your browser's IndexedDB, `chrome.storage.local`, and `chrome.storage.session`. This data never leaves your computer unless you explicitly enable Cloud Sync.
2. **Google Drive (Optional):** If you sign in to your Google Account and turn on Cloud Sync, a JSON backup file named `data.json` containing your saved workspaces is transmitted over HTTPS (`TLS`) and stored in a dedicated folder named `SpaceTabs_Data` inside **your personal Google Drive account**.
   - Unsaved sessions remain strictly local on your device and are excluded from Google Drive backups.
   - Your backup data travels exclusively between your browser and Google's official API servers (`https://www.googleapis.com`).
   - SpaceTabs developers have **zero access** to your Google Drive files or credentials.

---

## 3. Chrome Extension Permissions Justification

In accordance with Chrome Web Store Developer Policies, here is why SpaceTabs requests each permission:

* **`tabs`:** Needed to detect open tabs, group them into workspaces (Spaces), restore saved tabs, and swap window tab sets when switching spaces.
* **`storage`:** Needed to persist user preferences, appearance palettes, sync metadata/tombstones, and per-window session bindings locally in `chrome.storage.local` and `chrome.storage.session`.
* **`alarms`:** Needed to schedule periodic background checks for inactive tabs to trigger memory-saving tab suspension and optional periodic cloud sync checks.
* **`identity`:** Needed to authenticate with Google's OAuth2 service when you choose to connect Google Drive for optional workspace synchronization.
* **`favicon`:** Needed to display website icons beside tab and resource titles inside the SpaceTabs workspace dashboard.
* **Host Permission (`https://www.googleapis.com/*`):** Needed to communicate directly with the official Google Drive REST API and Google OAuth2 userinfo endpoint over HTTPS when Cloud Sync is enabled.

---

## 4. Google API Limited Use Disclosure

SpaceTabs' use and transfer to any other app of information received from Google APIs will adhere to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements:
* SpaceTabs requests only the following OAuth2 scopes when you opt in to Google Drive Cloud Sync:
  - `https://www.googleapis.com/auth/drive.file` — grants access solely to the `SpaceTabs_Data/data.json` backup file created by SpaceTabs itself.
  - `https://www.googleapis.com/auth/userinfo.email` and `https://www.googleapis.com/auth/userinfo.profile` — used solely to display your connected Google account name, email, and avatar inside the extension UI.
* SpaceTabs does not read, modify, or delete any other files in your Google Drive.
* Information received from Google APIs is never shared with third parties, used for advertising, or used to train artificial intelligence models.

---

## 5. Third-Party Sharing and Tracking

* **No Advertising:** SpaceTabs does not display advertisements.
* **No Analytics or Trackers:** SpaceTabs contains zero telemetry scripts, Google Analytics, Mixpanel, or third-party tracking beacons.
* **No Data Selling:** We do not sell, rent, or monetize your data under any circumstances.

---

## 6. Data Retention and Deletion

* **Local Deletion:** You can delete any space, tab, note, task, or resource at any time from within the application. Uninstalling the extension from your browser immediately removes all locally stored extension data.
* **Cloud Backup Disconnection & Deletion:** Signing out of Google Drive in Settings disconnects your account and revokes the extension's OAuth token, while leaving your existing `SpaceTabs_Data/data.json` backup file intact in your Google Drive so you never lose data accidentally. To permanently delete your cloud backup, delete the `SpaceTabs_Data` folder directly from your Google Drive.

---

## 7. Children's Privacy

SpaceTabs does not knowingly collect or solicit personal information from children under the age of 13.

---

## 8. Changes to this Policy

If we update this Privacy Policy, we will post the revised version with an updated "Last Updated" date. Continued use of the extension indicates acceptance of the updated terms.

---

## 9. Contact Us

If you have any questions or feedback regarding this Privacy Policy, please open an issue on the official GitHub repository or contact the developer directly:

* **Project Repository:** https://github.com/abu-dojana/tab-manager
* **Developer Email:** abudojanatahmid@gmail.com
