<!-- Public, logged-out snapshot of app.intellect.co taken 2026-11-09 with 'weblens discover'. No account was used; shapes only, no values. -->
# Discovery — Intellect web app

Recorded 2026-11-09T06:14:44.927Z for 10s. Values are never stored: JSON is reduced to its shape and on-screen digits are masked as #.

## Endpoints (4)

### `GET https://app.intellect.co/version.json ?t`
status 200 · seen 1×
```json
{
  "version": "string",
  "buildTime": "string",
  "packageVersion": "string"
}
```

### `GET https://internal.intellect.co/api/identity/auth/me`
status 403 · seen 1×
```json
{
  "message": "string",
  "error": "string",
  "statusCode": "number"
}
```

### `GET https://internal.intellect.co/api/identity/config`
status 200 · seen 1×
```json
{
  "data": {
    "languages": [
      {
        "createdAt": "string",
        "updatedAt": "string",
        "name": "string",
        "isActive": "boolean",
        "id": "string",
        "translation": "string",
        "translationId": "null"
      }
    ],
    "urls": {
      "imageBase": "string",
      "audioBase": "string",
      "videoBase": "string",
      "coachingCredits": "string"
    },
    "rules": {
      "defaultLanguage": "string",
      "onboardingLanguageCountries": [
        "string"
      ],
      "APP_ONBOARDING_DATA": "string",
      "SUBSCRIPTION_INFO_DATA": "string",
      "APP_REFER_TITLE": "string",
      "APP_REFER_SUBTITLE": "string",
      "APP_ONBOARDING_ROLLOUT": "number",
      "HOME_BANNER_ROLLOUT": "number",
      "AB_MINI_SESSION_ROLLOUT": "number",
      "SUBSCRIPTION_DATA_V3": "string",
      "LP_DETAIL_GROUP_RESTRICT": "boolean",
      "TAB_TOOLKIT": "boolean",
      "sessionDass5": "number",
      "sessionDass5Questionnaire": "number",
      "signupConsentURL": "string",
      "TAB_TASKS": "boolean",
      "TEXT_ONLY": "boolean",
      "WISDOM_ROLLOUT": "number",
      "SUBSCRIPTION_INFO_DATA4": "string",
      "journal_catalogue": [
        "string"
      ],
      "rs_catalogue": [
        "string"
      ],
      "lp_catalogue": [
        "string"
      ],
      "PROVIDER_TAGS": "string",
      "APP_ONBOARDING_DATA_V2": "string",
      "DASS_SCORE": "number",
      "APP_ACCESS": "boolean",
      "sessionPHQ4": "string",
      "PHQ4_SCORE": "number",
      "sessionPHQ4Questionnaire": "string",
      "APP_MIN_VERSION": "string",
      "APP_LATEST_VERSION": "string",
      "showBannerEnabled": "boolean",
      "CN_VIDEO_WEB": "boolean",
      "STRESS_CHECK_LANGUAGES": [
        "string"
      ],
      "STRESS_CHECK_SESSION_ID": "string",
      "MIN_USER_AGE": "number",
      "enableAllyLable": "boolean",
      "eapHelpLine": "string",
      "BESPOKE_BENEFITS_ARTICLE": "string",
      "FAQ_ARTICLE": "string",
      "disableRecurringToPendingExp": "boolean",
      "postSessionWellBeingCheck": "boolean",
      "LP_COLLECTION_ID": "string",
      "RS_COLLECTION_ID": "string",
      "JOURNAL_COLLECTION_ID": "string",
      "scribeFAQ": "string",
      "RESEARCH_VIEW": "{…}",
      "DISABLE_TRIAGING_VERSION_IOS": "string",
      "OUTPLACEMENT_ORG": "number",
      "OUTPLACEMENT_SERVICE_PERIOD": "number",
      "EXPAND_PROVIDER_PROFILE_AI_SUMMARY": "boolean",
      "blackListedProviders": "number",
      "PHQ4_ASSESSMENT_ID": "string",
      "SECURITY_CHECK_ENABLED": "boolean",
      "ENABLE_APP_INTEGRITY": "boolean",
      "ENFORCE_SECURITY_BLOCK": "boolean",
      "AI_BOT": "boolean",
      "ALLOW_F2F": "boolean",
      "DATA_RESIDENCY_REGION": "string",
      "customisedCountryNames": "{…}",
      "DISABLE_COACHING_OOP": "boolean"
    }
  },
  "statusCode": "number",
  "success": "boolean"
}
```

### `POST https://internal.intellect.co/api/identity/auth/token`
status 401 · seen 1×
```json
{
  "message": "string",
  "error": "string",
  "statusCode": "number"
}
```

## Sockets (0)


## Screens (1)

### `/` — Intellect | Create A Better You

Stable ids (best selectors):
- `{ id: 'root' }` div — 
- `{ id: 'main-content' }` main — 
- `{ id: 'headlessui-menu-button-:r2:' }` button — 
- `{ id: 'email-input' }` input — 
- `{ id: 'password-input' }` input — 
- `{ id: 'footer-landmark' }` footer — 
- `{ id: 'cm__title' }` h2 — 
- `{ id: 'cm__desc' }` p — Intellect needs cookies to keep its websites reliable and secure, personalise content for you and to analyse how the websites are used. You can manage which cookies are set on your device, but if you disable cookies, some parts of the site may not work properly. For more information on how we process cookies, refer to our . You can withdraw your consent at any time by clicking Manage Cookies from the profile section at the top right of this website after logging in or from the bottom of this website while logging in. You may find additional details of these cookies in the “Manage cookies” section.
