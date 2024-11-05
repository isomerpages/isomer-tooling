const fs = require("fs").promises;
const { XMLParser } = require("fast-xml-parser");
const {
  convertHtmlToSchema,
  getIsHtmlContainingRedundantDivs,
} = require("./convert-tiptap");

// CONFIGURATION SETTINGS
const XML_FILE = "agc-newsroom.xml";
const ORIGIN_URL_PREFIX =
  "https://www.agc.gov.sg/newsroom/media-releases/newsitem/";
const DESTINATION_URL_PREFIX =
  "https://staging.d3695z8s87x860.amplifyapp.com/newsroom";
const EXCLUSION_LIST = [];

const ARTICLE_CATEGORY_MAPPING = {
  "agc-press-release-agc's-statement-on-contempt-of-court": "Media Releases",
  "agc-press-release-ong-beng-seng-charged-with-abetting-offences-under-sections-165-and-204a-of-the-penal-code":
    "Media Releases",
  "agc-press-release-s-iswaran-pleads-guilty-convicted-of-four-charges":
    "Media Releases",
  "forum-of-chief-legal-advisors-2024-welcome-address-by-ag-lucien-wong":
    "Speeches",
  "agc-annual-statistics-2022-2023": "Media Releases",
  "speech-by-deputy-attorney-general-ang-cheng-hock-s.c.-at-the-litigation-conference-2024":
    "Speeches",
  "joint-agc-cpib-press-release-two-individuals-related-to-seatrium-limited-charged-with-corruption-offences":
    "Media Releases",
  "agc-spf-joint-statement-on-completion-of-investigations-into-conduct-before-the-committee-of-privileges":
    "Media Releases",
  "lianhe-zaobao-article-on-the-collaboration-between-agc-and-the-anti-scam-command":
    "News",
  "lianhe-zaobao-article-on-the-rise-of-scam-cases-involving-money-mules":
    "News",
  "agc-press-release-agc's-statement-on-contempt-of-court": "Media Releases",
  "agc-press-release-ong-beng-seng-charged-with-abetting-offences-under-sections-165-and-204a-of-the-penal-code":
    "Media Releases",
  "agc-press-release-s-iswaran-pleads-guilty-convicted-of-four-charges":
    "Media Releases",
  "forum-of-chief-legal-advisors-2024-welcome-address-by-ag-lucien-wong":
    "Speeches",
  "agc-annual-statistics-2022-2023": "Media Releases",
  "speech-by-deputy-attorney-general-ang-cheng-hock-s.c.-at-the-litigation-conference-2024":
    "Speeches",
  "joint-agc-cpib-press-release-two-individuals-related-to-seatrium-limited-charged-with-corruption-offences":
    "Media Releases",
  "agc-spf-joint-statement-on-completion-of-investigations-into-conduct-before-the-committee-of-privileges":
    "Media Releases",
  "lianhe-zaobao-article-on-the-collaboration-between-agc-and-the-anti-scam-command":
    "News",
  "lianhe-zaobao-article-on-the-rise-of-scam-cases-involving-money-mules":
    "News",
  "OLY-2024---speech-by-the-attorney-general-lucien-wong-s.c": "Speeches",
  "joint-mom-agc-media-release-charges-against-the-national-environment-agency-and-two-of-its-employees-under-the-workplace-safety-and-health-act":
    "Media Releases",
  "speech-by-attorney-general-lucien-wong-at-the-13th-china-asean-prosecutors-general-conference":
    "Speeches",
  "joint-spf-agc-media-release-lee-wan-sing-7-november-2023": "Media Releases",
  "agc-media-release---public-advisory-on-scam-letter-bearing-agc-letterhead-and-forged-signature":
    "Media Releases",
  "lianhe-zaobao-article-on-technology-crime-task-force": "News",
  "lianhe-zaobao-article-on-technology-law-cluster": "News",
  "speech-by-deputy-attorney-general-ang-cheng-hock-s.c.-at-the-28th-international-association-of-prosecutors-annual-conference":
    "Speeches",
  "the-straits-times-article-getting-justice-for-scam-victims-some-end-up-bankrupt-and-with-broken-marriages":
    "News",
  "channel-news-asia-article-in-focus-how-did-child-porn-become-a-global-nightmare-and-what-is-singapore-doing-to-tackle-it":
    "News",
  "arrangement-on-cooperation-between-gpo-uzbekistan-and-agc": "Media Releases",
  "OLY-2023---speech-by-the-attorney-general-lucien-wong-sc": "Speeches",
  "agc-spf-mas-media-release-masterminds-behind-singapore's-largest-stock-market-manipulation-jailed":
    "Media Releases",
  "agc-media-release-man-convicted-for-assaulting-air-crew-and-administered-stern-warning-for-uttering-bomb-threat-on-singapore-airlines-flight":
    "Media Releases",
  "keynote-address-by-deputy-attorney-general-tai-wei-shyong-s.c.-at-the-sentencing-conference-2022":
    "Speeches",
  "agc-media-statement---senior-management-appointment-and-reappointments":
    "Media Releases",
  "keynote-address-by-attorney-general-lucien-wong-s.c.-at-the-39th-international-symposium-on-economic-crime-(isec)":
    "Speeches",
  "speech-by-deputy-chief-prosecutor-ivan-chua-at-the-39th-international-symposium-on-economic-crime-(isec)":
    "Speeches",
  "agc-annual-report-2021": "Media Releases",
  "agc-media-statement-memorial-football-match-for-mr-gnanasihamani-kannan-organised-by-agc-and-the-criminal-bar":
    "Media Releases",
  "agc-media-release-agc-statement-on-passing-of-senior-director-and-senior-state-counsel-mr-gnanasihamani-kannan":
    "Media Releases",
  "agc-media-statement-agc-s-response-to-statement-by-the-roman-catholic-archdiocese-of-singapore":
    "Media Releases",
  "AGC-media-statement-High-Court-finds-in-OS-856-2020-that-SDP-deliberately-published-false-statement-of-fact":
    "Media Releases",
  "channel-news-asia-commentary-is-anything-less-than-a-jail-sentence-just-a-slap-on-the-wrist":
    "News",
  "bloomberg-article-singapore-s-rise-sparks-boost-in-defense-against-financial-crime":
    "News",
  "agc-media-statement-court-of-appeal-dismisses-application-brought-by-panchalai-ap-supermaniam-in-case-of-nagaenthran":
    "Media Releases",
  "agc-media-release-appointment-of-solicitor-general-ms-daphne-hong":
    "Media Releases",
  "agc-media-statement-man-convicted-of-causing-death-and-grievous-hurt-by-rash-act":
    "Media Releases",
  "agc-media-statement-ravi-s-o-madasamy-to-face-contempt-of-court-proceedings-disciplinary-complaints-made-against-mr-ravi-and-mr-cheng-kim-kuan":
    "Media Releases",
  "the-straits-times-article-deploying-prosecutors-to-police-divisions-helps-clear-cases-faster":
    "News",
  "opening-of-the-legal-year-2022-speech-by-the-attorney-general-lucien-wong-s.c":
    "Speeches",
  "channel-news-asia-article-revised-edition-of-singapore-s-statute-book-with-simpler-language-of-the-laws-to-launch-end-december":
    "News",
  "agc-media-statement-launch-of-universal-revision-project": "Media Releases",
  "lianhe-zaobao-article-agc-role-in-COP-26": "News",
  "channel-news-asia-article-dealing-with-covid-19-offences-more-than-1-000-cases-prosecuted-in-court-in-18-months":
    "News",
  "agc-media-statement-high-court-dismisses-application-filed-by-m-s-k-k-cheng-law-llc-that-the-agc-and-the-cnb-discriminated-against-persons-of-malay-ethnicity":
    "Media Releases",
  "agc-media-statement-high-court-dismisses-application-filed-by-ms-k-k-cheng-law-llc-to-seek-the-committal-of-the-minister-for-home-affairs-and-law-for-alleged-contempt-of-court":
    "Media Releases",
  "agc-media-statement-high-court-dismisses-application-by-nagaenthran-a-l-k-dharmalingam-for-leave-to-commence-judicial-review-proceedings":
    "Media Releases",
  "the-straits-times-article-parliament-approves-separation-of-judicial-and-legal-services":
    "News",
  "agc-media-statement-court-judgment-in-pofma-appeals-ca-47-and-52-of-2020":
    "For Media",
  "AGC-MPA-SPF-media-release-criminal-syndicate-convicted-of-tampering-with-mass-flow-meters-to-cheat-over-USD300k-worth-of-marine-fuel-oil":
    "Media Releases",
  "channel-news-asia-feature-shame-fear-and-victim-blaming-why-sexual-crimes-are-under-reported":
    "News",
  "agc-media-statement-response-to-the-online-citizens-article-on-the-outrage-of-modesty-case-involving-dr-yeo-sow-nam":
    "Media Releases",
  "agc-media-statement-response-to-mr-eugene-thuraisingam-s-facebook-posts-on-the-outrage-of-modesty-case-involving-dr-yeo-sow-nam":
    "Media Releases",
  "agc-annual-report-2020": "Media Releases",
  "agc-media-statement-queries-related-to-outrage-of-modesty-case-involving-dr-yeo-sow-nam":
    "Media Releases",
  "agc-media-release-agc-engages-ms-sapna-jhangiani-qc-to-conduct-litigation-cases-and-support-training":
    "Media Releases",
  "channel-news-asia-article-the-road-to-recovery-from-childhood-sexual-abuse-after-an-allegation-what-next":
    "News",
  "the-straits-times-article-chief-exec-roles-at-agc-and-sal-reflect-growing-demands-of-managing-legal-work":
    "News",
  "joint-agc-spf-media-release-84-months-and-4-weeks-of-jail-for-recalcitrant-money-mule":
    "Media Releases",
  "joint-agc-mha-statement-david-james-roach-man-who-robbed-standard-chartered-bank-convicted-and-sentenced":
    "Media Releases",
  "the-straits-times-article-deterrence-should-continue-to-be-the-norm-in-sentencing-observers":
    "News",
  "agc-media-release-3-weeks-jail-for-man-who-impersonated-chinese-female-to-post-racially-offensive-tweets":
    "Media Releases",
  "the-straits-times-article-sexual-abuse-of-children-on-the-rise-in-singapore-why-victims-are-afraid-to-speak-out":
    "News",
  "today-article-prosecution-sexual-crimes": "News",
  "lianhe-zaobao-article-understanding-DPP-work": "News",
  "agc-media-release-discontinuation-of-criminal-proceedings-against-ravi-s-o-madasamy":
    "Media Releases",
  "agc-media-release-prosecution-against-accused-persons-for-chin-swee-road-murder":
    "Media Releases",
  "agc-media-release-significant-jail-terms-for-sisters-involved-in-abuse-of-victim-with-intellectual-disability":
    "Media Releases",
  "opening-of-the-legal-year-2021-speech-by-the-attorney-general-lucien-wong-s.c":
    "Speeches",
  "the-straits-times-article-frameworks-that-help-courts-in-sentencing": "News",
  "things-you-always-wanted-to-ask-a-deputy-public-prosecutor-mothership":
    "News",
  "joint-agc-sfa-media-release-companies-convicted-and-fined-SGD32000-for-spize-food-poisoning-incident":
    "Media Releases",
  "agc-media-release-appointment-of-deputy-attorney-general": "Media Releases",
  "agc-media-release-agc-files-disciplinary-complaint-to-law-society-against-mr-ravi-s-o-madasamy":
    "Media Releases",
  "media-release-incorrect-media-reporting-of-action-against-goldman-sachs-singapore-pte":
    "Media Releases",
  "media-release-agc-cad-and-mas-take-action-against-goldman-sachs-singapore-pte-on-1mdb-bond-offerings":
    "Media Releases",
  "channel-news-asia-article-evidence-intention-and-involvement-agc-lawyers-explain-the-decisions-behind-reducing-murder-charges":
    "News",
  "agc-media-release-letter-of-demand-sent-to-mr-ravi-s-o-madasamy":
    "Media Releases",
  "agc-media-release-orchard-towers-murder-case-for-accused-person-tan-sen-yang-to-be-tried-in-the-high-court":
    "Media Releases",
  "agc-media-release-interview-by-mr-ravi-s-o-madasamy-given-to-the-online-citizen-asia-on-19-october-2020":
    "Media Releases",
  "agc-media-release-orchard-towers-murder-allegations-of-preferential-treatment-for-different-races-in-sentencing-are-false-and-baseless":
    "Media Releases",
  "agc-media-release-leave-application-in-HC-OS-559-2020": "Media Releases",
  "agc-media-statement-of-9-september-2020": "Media Releases",
  "agc-media-release-high-court-judgment-in-parti-liyani-v-pp":
    "Media Releases",
  "the-straits-times-article-keeping-remand-numbers-in-check-with-e-tagging-and-reduced-bail":
    "News",
  "the-straits-times-article-joint-effort-tech-in-prosecuting-white-collar-crimes-agc":
    "News",
  "agc-annual-report-2019-highlights": "Significant Work Highlights 2019",
  "lianhe-zaobao-article-prosecuting-sexual-predators-protecting-the-victims-while-pursuing-justice":
    "News",
  "agc-press-release-hearing-of-contempt-proceedings-against-mr-li-shengwu":
    "Media Releases",
  "channel-news-asia-article-covid-19-court-cases-why-have-some-people-not-been-charged":
    "News",
  "agc-press-release-dismissal-of-applications-by-gobi-al-avedian-and-datchinamurthy-al-kataiah":
    "Media Releases",
  "todayonline-article-nightclub-couple-who-trafficked-bangladeshi-women-jailed-5.5-years-fined-in-first-such-conviction":
    "News",
  "response-to-media-queries-on-the-outcome-of-interlocutory-applications-involving-mr-li-shengwu":
    "Media Releases",
  "agc's-media-statement-in-response-to-mr-li-shengwu's-facebook-post-of-23-january-2020":
    "Media Releases",
  "agc's-media-statement-court-hearing-on-misleading-article-published-by-sdp":
    "Media Releases",
  "in-response-to-media-queries-in-relation-to-mr-li-shengwu's-facebook-post-of-22-january-2020":
    "Media Releases",
  "lianhe-zaobao-article-Speak-and-act-cautiously-to-avoid-breaching-gag-orders":
    "News",
  "berita-mediacorp-article-Faizal-is-confident-that-more-malay-muslims-in-Singapore-will-become-Senior-Counsel":
    "News",
  "opening-of-the-legal-year-2020---speech-by-the-attorney-general-lucien-wong-s.c":
    "Speeches",
  "the-straits-times-article-pilot-scheme-to-deal-with-drink-drivers-raises-concern":
    "News",
  "agc's-media-statement-on-three-applications-challenging-the-constitutionality-of-s-377a-of-the-penal-code":
    "Media Releases",
  "speech-by-attorney-general-lucien-wong-s.c.-at-the-12th-china-asean-prosecutors-general-conference-2019":
    "Speeches",
  "filing-of-notice-of-appeal-against-sentence-in-the-case-of-synnex-trading-pte-ltd-(-synnex-trading-)":
    "Media Releases",
  "sub-judice-reminder-on-the-publication-of-affidavits-not-yet-adduced-in-evidence":
    "Media Releases",
  "sub-judice-and-gag-order-reminders-on-case-of-child's-death-at-chin-swee-road":
    "Media Releases",
  "keynote-address-by-deputy-attorney-general-hri-kumar-nair-s.c.-at-the-37th-cambridge-international-symposium-on-economic-crime-3-september-2019-fatf-30-years-on":
    "Speeches",
  "keynote-address-by-attorney-general-lucien-wong-s.c.-at-the-37th-cambridge-international-symposium-on-economic-crime-2-september-2019-fighting-economic-crime-a-shared-responsibility!":
    "Speeches",
  "lianhe-zaobao-article-Challenges-in-prosecuting-white-collar-crimes": "News",
  "agc-annual-report---2018-highlights": "Significant Work Highlights 2018",
  "dismissal-of-application-by-pannir-selvam-a-l-pranthaman": "Media Releases",
  "today-article-agc-rejects-claim-it-sent-threatening-letter-to-lawyer-of-malaysian-death-row-convicts":
    "News",
  "lianhe-zaobao-article-legislation-division-ensures-the-integrity-of-our-statutes":
    "News",
  "signing-of-mou-on-cooperation-between-agc-and-ospp-lao-pdr":
    "Media Releases",
  "lianhe-zaobao-article-legislation-division-meticulously-drafts-bills-to-ensure-clear-laws":
    "News",
  "lianhe-zaobao-article-Will-pleading-guilty-lead-to-reduced-charges": "News",
  "extradition-of-indian-national-hitesh-madhubhai-patel-to-the-united-states-of-america":
    "Media Releases",
  "the-business-times-article-string-of-public-agencies-lease-offices-at-funan":
    "News",
  "outcome-of-mr-li-shengwu's-appeal": "Media Releases",
  "the-straits-times-article-civil-service-pair-heads-for-the-top-of-the-world":
    "News",
  "criminal-law-conference-2019-(7-march-2019)---opening-address-by-deputy-attorney-general-hri-kumar-nair-s.c":
    "Speeches",
  "lianhe-zaobao-article-客工涉非礼中风妇改判无罪-总检察署提出刑事参考": "News",
  "straits-times-article-judge-shoppers-who-make-false-allegations-face-stern-action-agc":
    "News",
  "signing-of-mou-on-cooperation-between-agc-and-spp-vietnam": "Media Releases",
  "in-response-to-media-queries-in-relation-to-lee-hsien-yang's-facebook-post-of-7-january-2019":
    "Media Releases",
  "opening-of-the-legal-year-2019---speech-by-the-attorney-general-lucien-wong-s.c":
    "Opening of Legal Year",
  "agc-refers-case-of-potential-professional-misconduct-involving-ms-lee-suet-fern-to-law-society":
    "Media Releases",
  "lianhe-zaobao-article-under-what-circumstances-will-a-coroners-inquiry-be-held":
    "News",
  "straits-times-article-law-building-the-next-generation": "News",
  "channel-news-asia-article-simplifying-the-language-of-singapore-laws-on-track-as-more-people-visit-law-website":
    "News",
  "straits-times-article-agc-rebuts-don-s-criticism-over-disciplinary-probe-of-3-lawyers":
    "News",
  "singapore-academy-of-law-annual-lecture-2018-(11-october-2018)---opening-remarks-by-attorney-general-lucien-wong":
    "Speeches",
  "jolovan-wham-and-john-tan-found-guilty-of-scandalising-the-singapore-judiciary-first-convictions-under-administration-of-justice-(protection)-act-2016":
    "Media Releases",
  "straits-times-forum-letter-public-prosecutor-s-stand-on-section-377a-consistent":
    "News",
  "government-has-not-removed-or-restricted-prosecutorial-discretion-for-section-377a-public-prosecutor-retains-full-prosecutorial-discretion":
    "Media Releases",
  "soccer-friendly-between-players-from-the-agc-criminal-bar-and-the-yellow-ribbon-project-at-5th-ag's-challenge-cup":
    "Media Releases",
  "lianhe-zaobao-article-trial-process-crossing-of-swords": "News",
  "china's-prosecutor-general-zhang-jun-speaks-at-the-attorney-general's-lecture-2018":
    "Media Releases",
  "attorney-general-s-lecture-2018-ag's-opening-remarks": "Speeches",
  "speech-by-attorney-general-lucien-wong-s.c.-at-the-11th-china-asean-prosecutors-general-conference-2018":
    "Speeches",
  "lianhe-zaobao-article-mitigating-factors-early-guilty-plea-and-show-of-remorse":
    "News",
  "straits-times-article-legal-stalwart-senior-counsel-jeffrey-chan-retires-after-45-years":
    "News",
  "agc-annual-report-summaries-highlights-of-2017":
    "Significant Work Highlights 2017",
  "filing-of-substantive-application-for-order-of-committal-against-wham-kwok-han-jolovan":
    "Media Releases",
  "filing-of-substantive-application-for-order-of-committal-against-tan-liang-joo-john":
    "Media Releases",
  "opening-address-by-attorney-general-lucien-wong-s.c.-at-the-american-bar-association-2018-section-of-international-law-investment-arbitration-trans-pacific-transactions-conference":
    "Speeches",
  "quote-from-attorney-general-lucien-wong-in-response-to-the-announcement-of-second-solicitor-general-mavis-chionh-s.c.-being-appointed-judicial-commissioner-of-the-high-court":
    "Media Releases",
  "agc's-response-to-the-court-of-appeal's-decision-in-the-city-harvest-church-case":
    "Media Releases",
  "joint-statement-on-arrest-of-david-james-roach-in-the-united-kingdom":
    "Media Releases",
  "speech-of-the-attorney-general-lucien-wong-at-the-opening-of-the-legal-year-2018":
    "Media Releases",
  "conditional-warning-issued-to-keppel-offshore-marine-ltd": "Media Releases",
  "keynote-address-by-deputy-attorney-general-hri-kumar-nair-s.c.-at-the-sentencing-conference-2017-review-rehabilitation-and-reintegration":
    "Speeches",
  "paper-presented-by-attorney-general-lucien-wong-s.c.-on-prosecution-in-the-public-interest-at-the-singapore-law-review-annual-lecture-2017":
    "Speeches",
  "former-agc-building-an-icon-of-high-street": "News",
  "paper-presented-by-deputy-attorney-general-hri-kumar-nair-s.c.-at-the-22nd-international-association-of-prosecutors-annual-conference-2017":
    "speech",
  "agc-media-release-signing-of-memorandum-of-understanding-on-cooperation-between-the-attorney-general's-office-of-the-republic-of-indonesia-and-the-attorney-general's-chambers-of-the-republic-of-singapore":
    "Media Releases",
  "agc-media-release-application-for-leave-to-commence-commital-proceeding-against-li-shengwu":
    "Media Releases",
  "agc-media-release-new-singapore-statutes-online-and-other-plus-updates":
    "Media Releases",
  "agc-media-release-the-city-harvest-church-case---prosecution-files-criminal-reference":
    "Media Releases",
  "speech-of-the-attorney-general-lucien-wong-s.c.-at-the-agc150-dinner-and-dance":
    "Speeches",
  "agc-media-release-removal-of-contemptuous-material-and-issuance-of-apology-by-han-hui-hui":
    "Media Releases",
  "agc-media-release-pp-vs-joshua-robinson": "Media Releases",
  "agc-media-release-appointment-of-deputy-attorney-general-mr-hri-kumar-nair-s.c":
    "Media Releases",
  "straits-times-article-swifter-justice-for-abused-foreign-workers": "News",
  "speech-of-the-attorney-general-vk-rajah-s.c.-at-the-opening-of-the-legal-year-2017":
    "Speeches",
  "agc-media-release-appointment-of-solicitor-general-mr-kwek-mean-luck-and-second-solicitor-general-ms-mavis-chionh-sze-chyi":
    "Media Releases",
  "agc-media-release-prosecutorial-action-relating-to-fatal-accident-involving-two-smrt-employees":
    "Media Releases",
  "joint-statement-by-agc-cad-and-mas-masterminds-behind-the-manipulation-of-blumont-asiasons-and-liongold-shares-charged":
    "Media Releases",
  "agc-media-statement-two-bsi-employees-named-by-mas-charged-for-criminal-offences":
    "Media Releases",
  "agc-media-statement-inaugural-ag's-lecture-2016": "Media Releases",
  "welcome-address-by-attorney-general-v-k-rajah-sc-at-the-ag's-lecture-2016":
    "Speeches",
  "agc-media-statement-prosecution-files-notice-of-appeal-in-yang-yin's-case":
    "Media Releases",
  "agc-media-statement-agc-files-disciplinary-complaint-to-law-society-against-mr-edmund-wong-sin-yee":
    "Media Releases",
  "straits-times-article-breaking-the-silence-on-sexual-crimes": "News",
  "joint-media-statement-investigations-into-1mdb-related-fund-flows-through-singapore":
    "Media Releases",
  "agc-media-statement-appointment-of-third-solicitor-general-ms-mavis-chionh-sze-chyi":
    "Media Releases",
  "agc-media-statement-quote-from-ag-v-k-rajah-sc-on-judicial-commissioners-appointments-2016":
    "Media Releases",
  "agc-media-statement-abuse-of-process-of-court-in-kho-jabing-s-case":
    "Media Releases",
  "agc-media-statement-prosecution-files-petition-of-appeal-in-the-case-of-pp-v-gs-engineering-and-construction-corp":
    "Media Releases",
  "agc-media-statement-charging-of-former-bsi-employee-yeo-jiawei":
    "Media Releases",
  "agc-media-statement-prosecution-files-a-notice-of-appeal-in-the-criminal-case-no.-41-of-2015":
    "Media Releases",
  "agc-media-statement-swiss-request-for-mutual-legal-assistance":
    "Media Releases",
  "agc-llrd-survey-to-improve-and-modernise-singapore-statute-book":
    "Media Releases",
  "coroner's-inquiry-into-the-death-of-mohamed-taufik-bin-zahar-opening-statement-by-the-state-counsels":
    "Media Releases",
  "coroner's-inquiry-into-the-death-of-mohamed-taufik-bin-zahar-summary-of-evidence":
    "Media Releases",
  "agc-key-strategic-initiatives-2015": "Media Releases",
  "speech-of-the-attorney-general-vk-rajah-s.c.-at-the-opening-of-the-legal-year-2016":
    "Speeches",
  "agc-media-statement-pp-v-lam-leng-hung-ors-prosecution-appeals-against-manifestly-inadequate-sentences":
    "Media Releases",
  "opinion-editorial-in-the-business-times-by-the-attorney-general-v-k-rajah-sc-financial-crime-leaders-can-instil-spirit-of-compliance":
    "Media Releases",
  "agc-media-statement-administering-of-24-month-conditional-warning-to-goh-aik-huat":
    "Media Releases",
  "summary-of-prosecution-s-submissions-for-magistrate-s-appeal-no.-9108-of-2015-amos-yee-v-public-prosecutor":
    "Media Releases",
  "justice-tay-yong-kwang's-oral-judgement-for-magistrate-s-appeal-no.-9108-of-2015-amos-yee-v-public-prosecutor":
    "Media Releases",
  "strengthen-and-balance-judicial-system--straits-times-forum-letter-23-september-2015":
    "Media Releases",
  "justice-seen-to-be-even-handed--straits-times-editorial--30-september-2015":
    "Media Releases",
  "agc-media-statement-prosecution's-appeal-against-manifestly-excessive-sentence-(pp-vs-lim-choon-teck)":
    "Media Releases",
  "pp-v-amos-yee-prosecution's-skeletal-submissions": "Media Releases",
  "agc-media-statement-appointment-of-second-solicitor-general-mr-kwek-mean-luck":
    "Media Releases",
  "agc-media-statement-high-court-allows-agc's-striking-out-of-yong-vui-kong's-judicial-review-application":
    "Media Releases",
  "media-statement-stern-warning-administered-for-pmo-website-hoax":
    "Media Releases",
  "reminder-on-public-comments-regarding-three-singaporean-men-charged-with-offences-allegedly-committed-during-a-thaipusam-procession":
    "Media Releases",
  "agc-media-statement-appointment-of-deputy-attorney-general":
    "Media Releases",
  "attorney-general's-chambers'-key-initiatives-in-2014": "Media Releases",
  "speech-of-the-attorney-general-vk-rajah-s.c.-at-the-opening-of-the-legal-year-2015":
    "Speeches",
  "winning-essay-of-agc-law-reform-essay-competition-2014": "Media Releases",
  "agc-law-reform-essay-competition-2014": "Media Releases",
  "agc-media-statement-organisational-changes-in-agc's-crime-cluster":
    "Media Releases",
  "general-notice-publication-of-affidavits": "Media Releases",
  "agc-media-statement-clarification-on-disposal-of-suicide-instruments-in-the-death-of-dr-shane-todd":
    "Media Releases",
  "agc-media-statement-contemptuous-tweets-on-twitter-account-of-tan-kim-hock":
    "Media Releases",
  "agc-media-statement-judicial-review-proceedings-by-persons-charged-in-connection-with-little-india-riot-withdrawn":
    "Media Releases",
  "agc-law-reform-essay-competition-20141": "Media Releases",
  "agc-media-statement-appointment-of-attorney-general-steven-chong-as-judge-of-the-high-court":
    "Media Releases",
  "agc-media-statement-lawrence-wee-v-ag_withdrawal-of-appeal-and-intervention-applications":
    "Media Releases",
  "unavailability-of-singapore-statutes-online": "Media Releases",
  "agc-media-statement-first-person-to-qualify-for-re-sentencing-under-the-diminished-responsibility-limb":
    "Media Releases",
  "agc-media-statement-criminal-investigations-against-lee-kim-huat-@-lim-hai-tiong":
    "Media Releases",
  "speech-by-the-attorney-general-at-singapore-management-university-groundbreaking-event":
    "Speeches",
  "keynote-address-by-attorney-general-at-the-criminal-law-conference-2014":
    "Speeches",
  "solicitor-general-mrs-koh-juat-jong-retires-from-public-service.-judicial-commissioner-lionel-yee-returns-to-agc-as-sg":
    "Media Releases",
  "speech-by-attorney-general-at-the-opening-of-legal-year-2014": "Speeches",
};

const getArticleCategory = (title, html) => {
  const htmlLower = html.toLowerCase();
  const titleLower =
    typeof title === "string" ? title.toLowerCase() : title.toString();

  if (
    htmlLower.includes("for the sitting of parliament ") ||
    htmlLower.includes("name and constituency of member of parliament")
  ) {
    return "Parliamentary QA";
  } else if (
    (titleLower.includes("speech ") ||
      titleLower.includes("remarks ") ||
      titleLower.includes("address ") ||
      htmlLower.includes("ladies and gentlemen")) &&
    titleLower.includes(" by ")
  ) {
    return "Speeches";
  } else if (htmlLower.includes("we thank") && htmlLower.includes(" letter")) {
    return "Forum Replies";
  } else {
    return "Press Releases";
  }
};

const getArticleCategoryMap = (url) => {
  if (Object.keys(ARTICLE_CATEGORY_MAPPING).includes(url)) {
    return ARTICLE_CATEGORY_MAPPING[url];
  }

  return "Uncategorised";
};

const main = async () => {
  const reportItems = [];

  // Step 0: Create the output directory if it doesn't exist, otherwise skip
  try {
    await fs.mkdir("output");
  } catch (error) {
    if (error.code !== "EEXIST") {
      throw error;
    }
  }

  // Step 1: Read XML file
  const xml = await fs.readFile(XML_FILE, "utf8");

  // Step 2: Parse XML to JSON
  const parser = new XMLParser({ ignoreAttributes: false });
  const jObj = parser.parse(xml);

  await Promise.all(
    jObj["atom:entry"]["cmisra:object"]
      .map((item) => {
        // Step 3: Extract data from JSON and extract properties from items
        const properties = item["cmis:properties"];

        const title = properties["cmis:propertyString"].find(
          (property) => property["@_propertyDefinitionId"] === "sf:Title"
        )["cmis:value"];

        const url = properties["cmis:propertyString"].find(
          (property) => property["@_propertyDefinitionId"] === "sf:UrlName"
        )["cmis:value"];

        const newUrl = url
          .toString()
          .replaceAll("'", "-")
          .replaceAll(".", "-")
          .replaceAll("!", "-")
          .replaceAll("@", "at")
          .slice(0, 250);

        const publishDate = properties["cmis:propertyDateTime"]["cmis:value"];

        const html = properties["cmis:propertyString"].find(
          (property) =>
            property["@_propertyDefinitionId"] === "sf:ArticleContent"
        )["cmis:value"];

        return {
          title,
          url,
          newUrl,
          publishDate,
          html,
        };
      })
      .map(async ({ title, url, newUrl, publishDate, html }) => {
        const isHtmlContainingRedundantDivs =
          getIsHtmlContainingRedundantDivs(html);
        // const category = getArticleCategory(title, html);
        const category = getArticleCategoryMap(url);

        if (EXCLUSION_LIST.includes(newUrl)) {
          reportItems.push({
            title:
              typeof title === "string" ? title.replaceAll('"', '""') : title,
            url: `${ORIGIN_URL_PREFIX}${url}`,
            newUrl: `${DESTINATION_URL_PREFIX}/${newUrl}`,
            publishDate,
            category,
            status: "Skipped",
            remarks: "Excluded from migration",
          });
          return;
        } else if (html.includes("<div") && !isHtmlContainingRedundantDivs) {
          // Skip if html contains any div or span tags that contain attributes
          // that can have visual impact
          reportItems.push({
            title:
              typeof title === "string" ? title.replaceAll('"', '""') : title,
            url: `${ORIGIN_URL_PREFIX}${url}`,
            newUrl: `${DESTINATION_URL_PREFIX}/${newUrl}`,
            publishDate,
            category,
            status: "Skipped",
            remarks: "HTML contains div tags",
          });
          return;
        }

        const reportItem = {
          title:
            typeof title === "string" ? title.replaceAll('"', '""') : title,
          url: `${ORIGIN_URL_PREFIX}${url}`,
          newUrl: `${DESTINATION_URL_PREFIX}/${newUrl}`,
          publishDate,
          category,
          status: "Migrated",
          remarks: [],
        };

        if (html.includes("<img ")) {
          reportItem.status = "Needs review";
          reportItem.remarks.push("HTML contains img tags");
        } else if (html.includes("<div") && isHtmlContainingRedundantDivs) {
          reportItem.remarks.push(
            "HTML contained redundant div tags that were removed"
          );
        } else if (html.includes("<iframe")) {
          reportItem.remarks.push("HTML contains iframe tags");
        } else if (
          html.includes("<a ") &&
          (html.includes('href="[documents%7C') ||
            html.includes('href="/docs/') ||
            html.includes('href="http://www.agc.gov.sg/docs/') ||
            html.includes('href="https://www.agc.gov.sg/docs/') ||
            html.includes('href="http://www-agc-gov-sg-admin.cwp.sg/docs/'))
        ) {
          reportItem.status = "Needs review";
          reportItem.remarks.push("HTML contains links to reference documents");
        }

        reportItems.push(reportItem);

        const schema = await convertHtmlToSchema(
          title,
          publishDate,
          category,
          html
        );

        // Save schema to file
        await fs.writeFile(
          `output/${newUrl}.json`,
          JSON.stringify(schema, null, 2)
        );
      })
  );

  // Save skipped items as CSV file
  const csv = reportItems.map((item, index) => {
    return `${index + 1},"${item.title}","${item.url}","${item.newUrl}","${
      item.publishDate
    }","${item.category}","${item.status}","${item.remarks.join(", ")}"`;
  });
  const csvHeaders =
    "No.,Title,Original URL,Staging URL,Publish Date,Category,Status,Remarks\n";
  await fs.writeFile("results.csv", csvHeaders + csv.join("\n"));
};

main();
