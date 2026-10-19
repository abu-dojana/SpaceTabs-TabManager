# Privacy Policy for SpaceTabs — Tab Manager

**Last Updated:** October 19, 2026

SpaceTabs ("we", "our", or "the extension") is committed to protecting your privacy. This Privacy Policy describes how your information is handled when you use the SpaceTabs Chrome Extension.

SpaceTabs is designed with a **strict local-first architecture**. We do not operate external tracking servers, we do not sell your personal data, and we do not monitor your browsing behavior.

---

## 1. Information We Collect and Process

SpaceTabs only processes data necessary to provide its core tab and workspace management functionality:

* **Tab URLs and Page Titles:** When you open tabs, save tabs, or organize spaces, SpaceTabs temporarily reads the URLs, page titles, and favicons of those tabs. This information is stored **locally on your device** inside your browser's IndexedDB database.
* **Workspace Content:** Notes, task checklists, and resource bookmarks you create inside SpaceTabs are stored strictly on your local computer.
* **User Preferences:** Custom settings such as theme choices, sidebar width, auto-suspension thresholds, domain whitelists, and Patreon links are saved locally using Chrome's `storage.local` API.
* **Google Account Profile Information (Optional):** If you choose to enable Google Drive Cloud Sync, the extension receives your basic public profile information (name, email address, and avatar image) via Google's `oauth2` API to display your active account status in the user interface.

---

## 2. Where Your Data is Stored

1. **Local Storage (Primary):** All your spaces, tabs, notes, resources, and settings are stored locally in your browser's IndexedDB and `chrome.storage.local`. This data never leaves your computer unless you explicitly enable Cloud Sync.
2. **Google Drive (Optional):** If you sign in to your Google Account and turn on Cloud Sync, a single encrypted backup file named `data.json` is saved in a dedicated folder named `SpaceTabs_Data` inside **your personal Google Drive account**.
   - Your backup data is stored directly in your Google Drive and travels exclusively between your browser and Google's official API servers (`https://www.googleapis.com`).
   - SpaceTabs developers have **zero access** to your Google Drive files or credentials.

---

## 3. Chrome Extension Permissions Justification

In accordance with Chrome Web Store Developer Policies, here is why SpaceTabs requests each permission:

* **`tabs`:** Needed to detect open tabs, group them into spaces, restore saved tabs, and swap tab sets when switching workspaces.
* **`storage`:** Needed to save user preferences, appearance settings, and domain whitelists locally.
* **`alarms`:** Needed to schedule periodic checks for inactive tabs to trigger memory-saving tab suspension and cloud sync.
* **`identity`:** Needed to authenticate with Google's native OAuth2 service when you choose to connect Google Drive.
* **`favicon`:** Needed to display website icons beside tab titles in your workspace dashboard.
* **Host Permission (`https://www.googleapis.com/*`):** Needed to communicate directly with the official Google Drive REST API for data synchronization.

---

## 4. Google API Limited Use Disclosure

SpaceTabs' use and transfer to any other app of information received from Google APIs will adhere to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements:
* SpaceTabs only requests the minimal `https://www.googleapis.com/auth/drive.file` scope, granting access solely to files created by SpaceTabs itself.
* SpaceTabs does not read, modify, or delete any other files in your Google Drive.
* Information received from Google APIs is never shared with third parties, used for advertising, or used to train artificial intelligence models.

---

## 5. Third-Party Sharing and Tracking

* **No Advertising:** SpaceTabs does not display advertisements.
* **No Analytics or Trackers:** SpaceTabs contains zero telemetry scripts, Google Analytics, Mixpanel, or third-party tracking beacons.
* **No Data Selling:** We do not sell, rent, or monetize your data under any circumstances.

---

## 6. Data Retention and Deletion

* **Local Deletion:** You can delete any space, tab, note, or task at any time from within the application. Uninstalling the extension from your browser instantly deletes all locally stored data.
* **Cloud Backup Deletion:** You can delete your cloud backup at any time by signing out of Google Drive in Settings or by deleting the `SpaceTabs_Data` folder directly from your Google Drive.

---

## 7. Children's Privacy

SpaceTabs does not knowingly collect or solicit personal information from children under the age of 13.

---

## 8. Changes to this Policy

If we update this Privacy Policy, we will post the revised version with an updated "Last Updated" date. Continued use of the extension indicates acceptance of the updated terms.

---

## 9. Contact Us

If you have any questions or feedback regarding this Privacy Policy, please open an issue on the official GitHub repository or contact the developer directly:

* **Project Repository:** https://github.com/
* **Support Email:** support@spacetabs.app (or your personal developer email)
