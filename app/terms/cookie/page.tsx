"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";

export default function CookiePolicyPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();

  // Determine dashboard link based on user role
  const dashboardLink = profile?.role === 'JOB_SEEKER' 
    ? '/home/seeker' 
    : profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER'
    ? '/home/employer'
    : '/';

  // Determine back link for non-logged-in users
  const backLink = user ? dashboardLink : '/auth/signup';
  const backText = user ? 'Back to Dashboard' : 'Back to Sign Up';

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-sm z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-navy-900 font-bold text-xl">
            HireMe
          </Link>
          <Link 
            href={backLink}
            className="flex items-center text-navy-800 font-semibold hover:text-navy-900 transition-all duration-200 bg-sky-200/10 hover:bg-sky-200/20 px-3 sm:px-4 py-2 rounded-full w-fit min-h-[44px] text-sm sm:text-base hover:shadow-md hover:scale-105"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {backText}
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        {/* Page Header */}
        <div className="mb-8 lg:mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-navy-900 mb-4 tracking-tight">
            Cookie Policy
          </h1>
          <p className="text-slate-600 text-lg">
            Effective Date: January 10, 2026
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8 lg:p-10 prose prose-slate max-w-none">
          <div className="space-y-8">
            {/* Introduction */}
            <section>
              <p className="text-slate-700 leading-relaxed">
                This Cookie Policy explains how HireMe LLC ("HireMe," "we," "us," or "our") uses cookies and similar tracking technologies on our website and Platform. It should be read in conjunction with our Privacy Policy, which provides further information about our data handling practices. By using our site, you agree that we can use cookies as described in this policy. If you do not agree, you should disable cookies in your browser or refrain from using our site.
              </p>
            </section>

            {/* Section 1: What Are Cookies? */}
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">1. What Are Cookies?</h2>
              <p className="text-slate-700 leading-relaxed">
                Cookies are small text files that websites place on your device (computer, smartphone, tablet) when you visit. They are widely used to make websites work more efficiently and to provide information to the site owners. Cookies can be "session" cookies (which expire when you close your browser) or "persistent" cookies (which remain on your device for a set period or until deleted). Cookies may be set by the site you're visiting (first-party cookies) or by third parties (third-party cookies) who provide services or features on the site (such as analytics or advertising networks).
              </p>
            </section>

            {/* Section 2: How We Use Cookies */}
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">2. How We Use Cookies</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                HireMe uses cookies and similar technologies (like web beacons, pixels, local storage) for a variety of purposes:
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Essential Cookies</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                These cookies are necessary for the website and Platform to function and cannot be switched off in our systems. For example, they include cookies that enable you to log into secure areas, maintain your session, or use shopping cart functionality. Without these cookies, some parts of our site or service would not work properly. For instance, when Employers or Candidates log in, we set a cookie to keep you logged in as you navigate between pages. These cookies do not store any personally identifiable information beyond what is needed for performance (such as an encrypted user ID).
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Functional Cookies</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                These cookies allow us to remember choices you make on our site to provide enhanced, more personalized features. For example, we might use a cookie to save your preferred language or to remember your communication preferences. Functional cookies may also include remembering certain preferences in your user profile. While not strictly essential, these improve your experience. If you disable them, some preferences might not be saved.
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Analytics Cookies</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                We use analytics and performance cookies to collect information about how users interact with our site and Platform, such as which pages are visited, the time spent on pages, click-throughs, and any issues encountered (like error messages). This helps us improve our services and understand user engagement. We primarily use Google Analytics (and possibly similar tools) which set cookies to report site usage. The information these cookies collect is aggregated and not directly identifying you. For example, these cookies might tell us that 50 users visited the "Pricing" page and spent on average 30 seconds there, or that a certain feature is rarely used. We use this information to enhance the Platform's functionality and content.
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Advertising and Marketing Cookies</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                As of the effective date, HireMe does not host third-party banner ads or use cookies for third-party advertising on our Platform (our service is currently not supported by ad revenue). However, we may in the future use marketing cookies to track the effectiveness of our own advertising campaigns (for example, if we run ads on Google or LinkedIn to attract employers, a cookie might help us see if you came to our site via one of those ads). Additionally, if we implement retargeting ads, cookies or pixels would allow our advertising partners to show you ads on other sites based on your past visits to HireMe. These cookies would collect information such as which pages you visited on HireMe and your browsing history. If and when we introduce such cookies, we will update this policy and provide appropriate consent mechanisms if required by law. You can opt-out of targeted advertising as explained in Section 5 below.
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Third-Party Cookies</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                Some third-party services that we use may set their own cookies on our site. For example:
              </p>
              <ul className="list-disc list-inside space-y-3 text-slate-700 leading-relaxed ml-4 mb-4">
                <li><strong className="text-navy-900">Google Analytics:</strong> As mentioned, Google Analytics sets cookies (_ga, _gid, etc.) to collect usage data. Google's ability to use and share information collected by Google Analytics about your visits is governed by the Google Analytics Terms of Service and Google's Privacy Policy. If you wish, you can opt-out of Google Analytics (see below).</li>
                <li><strong className="text-navy-900">Authentication/Single Sign-On (SSO):</strong> If we allow signing in via Google, LinkedIn, or similar, those providers may set cookies to manage authentication.</li>
                <li><strong className="text-navy-900">Social Media:</strong> If our site includes sharing buttons or integration with social networks (LinkedIn, Facebook, Twitter etc.), those platforms may set cookies to recognize you or to log that you shared or interacted with content.</li>
              </ul>
              <p className="text-slate-700 leading-relaxed mb-4">
                We do not currently use cookies for the purpose of collecting sensitive personal data or for any purposes unrelated to our services.
              </p>
            </section>

            {/* Section 3: What Cookies Do We Set? */}
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">3. What Cookies Do We Set?</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                Below is a non-exhaustive list of cookies and similar technologies commonly in use on HireMe's Platform, categorized by their purpose. (Note: The exact names of cookies and details may change as we update our platform, but we aim to keep this list updated.)
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Essential Cookies:</h3>
              <ul className="list-disc list-inside space-y-2 text-slate-700 leading-relaxed ml-4 mb-4">
                <li><strong className="text-navy-900">hireme_session</strong> – First-party, session cookie. Preserves the user's logged-in session state across page requests.</li>
                <li><strong className="text-navy-900">XSRF-TOKEN</strong> – First-party, session cookie. Security cookie to prevent cross-site request forgery attacks (contains a token that must match with requests).</li>
                <li><strong className="text-navy-900">remember_user</strong> – First-party, persistent cookie. Used if you select "remember me" at login, to keep you logged in for a period (e.g., 2 weeks).</li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Functional Cookies:</h3>
              <ul className="list-disc list-inside space-y-2 text-slate-700 leading-relaxed ml-4 mb-4">
                <li><strong className="text-navy-900">locale</strong> – First-party, persistent. Stores the user's preferred language or locale for the site interface.</li>
                <li><strong className="text-navy-900">cookie_consent</strong> – First-party, persistent. Remembers that you've seen the cookie consent banner and your choice (so we don't show it every time).</li>
                <li><strong className="text-navy-900">ui_preferences</strong> – First-party, persistent. Might store certain UI settings (for example, whether you dismissed a tutorial or which dashboard layout you prefer).</li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Analytics Cookies (third-party):</h3>
              <ul className="list-disc list-inside space-y-2 text-slate-700 leading-relaxed ml-4 mb-4">
                <li><strong className="text-navy-900">_ga</strong> – Google Analytics cookie, persistent (2 years). Used to distinguish unique users by assigning a random ID.</li>
                <li><strong className="text-navy-900">_gid</strong> – Google Analytics cookie, persistent (24 hours). Used to distinguish users (short-term) and track session ID.</li>
                <li><strong className="text-navy-900">_gat</strong> – Google Analytics cookie, persistent (1 minute). Used to throttle request rate to Google Analytics servers.</li>
              </ul>
              <p className="text-slate-700 leading-relaxed mb-4">
                (If we use other analytics, their cookies might be listed similarly.)
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Advertising Cookies:</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                (Currently none from third parties; if we implement, e.g., Google Ads or LinkedIn Ads tracking, cookies/pixels from those would appear here.)
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Third-Party Integration Cookies:</h3>
              <ul className="list-disc list-inside space-y-2 text-slate-700 leading-relaxed ml-4 mb-4">
                <li>If a user logs in with Google OAuth, Google may set cookies such as SID, HSID (for account authentication) – these are third-party persistent cookies used by Google to manage login and account info.</li>
                <li>If we embed any content (like a YouTube video or a map), the content provider might set cookies. For instance, YouTube might set cookies to track video views or preferences. We would treat those similarly to third-party cookies.</li>
              </ul>
            </section>

            {/* Section 4: Managing Cookies on Our Site */}
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">4. Managing Cookies on Our Site</h2>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Cookie Consent Banner</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                When you first visit our site, you will see a banner or pop-up notifying you about our use of cookies. By clicking "Accept" (or similar) on the cookie banner, you consent to the placement of cookies as described. If you choose "Reject" or "Manage preferences," we will only set essential cookies and any other categories you enable. The banner gives you the option to accept or decline non-essential cookies (like analytics or marketing cookies). You can change your preferences at any time by [going to our Cookie Settings link] or adjusting your browser settings.
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Browser Controls</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                Most web browsers allow you to control cookies through their settings preferences. You can set your browser to refuse all or some cookies, or to prompt you before accepting a cookie from websites. For example:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 leading-relaxed ml-4 mb-4">
                <li>In Chrome, you can go to Settings &gt; Privacy and security &gt; Cookies and other site data.</li>
                <li>In Safari, Preferences &gt; Privacy &gt; Manage Website Data.</li>
                <li>In Firefox, Options &gt; Privacy &amp; Security &gt; Cookies and Site Data.</li>
                <li>In Edge, Settings &gt; Site permissions &gt; Cookies and site data.</li>
              </ul>
              <p className="text-slate-700 leading-relaxed mb-4">
                Using these settings, you can delete cookies that have already been set and block new ones. Be aware that if you block all cookies, our site's essential functions may be impaired (for instance, you might not be able to log in or add items to a cart).
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Opt-Out of Analytics</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                You can opt out of Google Analytics without affecting how you visit our site. Google provides a browser add-on for opting out of Google Analytics data collection (available at: <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-navy-800 hover:text-navy-700 underline">https://tools.google.com/dlpage/gaoptout</a>). Also, we honor any "Do Not Track" signals or global privacy controls where required by law (though currently our site's cookie usage might not change based on DNT in absence of a legal requirement; see Privacy Policy regarding DNT).
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Global Privacy Control (GPC)</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                If you have a GPC signal enabled (for California residents, as a way to opt-out of sale/sharing of personal data), our site will treat that as an opt-out of any cookies that would be considered a "sale" or "sharing" of personal information under CPRA. Presently, we do not sell personal data via cookies, but if that changes, we will comply accordingly.
              </p>
            </section>

            {/* Section 5: Third-Party Advertising and Do Not Track */}
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">5. Third-Party Advertising and Do Not Track</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                As mentioned, we are not currently running third-party ads. In the future, if we partner with advertisers or ad networks, cookies might be used to display targeted ads based on your interests. You would have the ability to opt-out of such targeting:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 leading-relaxed ml-4 mb-4">
                <li>Industry websites like the Digital Advertising Alliance (<a href="https://optout.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-navy-800 hover:text-navy-700 underline">optout.aboutads.info</a>) or Network Advertising Initiative (<a href="https://optout.networkadvertising.org" target="_blank" rel="noopener noreferrer" className="text-navy-800 hover:text-navy-700 underline">optout.networkadvertising.org</a>) allow you to opt-out of interest-based advertising from participating companies.</li>
                <li>Browser-based controls and mobile device settings can often limit ad tracking.</li>
              </ul>
              <p className="text-slate-700 leading-relaxed mb-4">
                <strong className="text-navy-900">"Do Not Track" Signals:</strong> Do Not Track is a browser setting that requests a web application disable its tracking of an individual user. At this time, our site does not respond differently to DNT signals, because there's no consensus on DNT's interpretation. However, we do not engage in cross-site tracking beyond the analytics/advertising practices described. If legislation or industry standards evolve, we will revisit our approach to DNT. California residents can use the GPC as mentioned.
              </p>
            </section>

            {/* Section 6: Cookies in Emails */}
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">6. Cookies in Emails:</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                Our marketing or notification emails may contain a "web beacon" or tracking pixel – a tiny clear image that tells us whether you opened the email or clicked on a link. We use this information to gauge the effectiveness of our communications and to tailor future emails. You can disable this by not downloading images in emails (most email clients allow you to block external images by default). Alternatively, you can opt out of marketing emails altogether, and we won't send you such tracked communications (note: we will still send essential emails which might include necessary tracking for security, e.g., if an email has a one-time login link, we track if it's clicked for security).
              </p>
            </section>

            {/* Section 7: Updates to This Policy */}
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">7. Updates to This Policy:</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our practices. When we do, we will revise the "Effective Date" at the top. If changes are significant, we may also provide a notice on our website or obtain consent as required by law (for example, if we later implement cookies for new purposes like advertising, we might ask for consent again). We encourage you to review this policy periodically.
              </p>
            </section>

            {/* Section 8: Contact Us */}
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">8. Contact Us:</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                If you have any questions about our use of cookies or about this Cookie Policy, please contact us:
              </p>
              <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 mb-4">
                <p className="text-slate-700 leading-relaxed">
                  <strong className="text-navy-900">HireMe LLC</strong><br />
                  2905 24th St N, Arlington VA<br />
                  Email: <a href="mailto:privacy@hireme.com" className="text-navy-800 hover:text-navy-700 underline">privacy@hireme.com</a>
                </p>
              </div>
              <p className="text-slate-700 leading-relaxed mb-4">
                By continuing to use our site and services, you acknowledge that you have read and understood this Cookie Policy.
              </p>
            </section>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-12 text-center">
          <Link 
            href={backLink}
            className="inline-flex items-center text-navy-800 font-semibold hover:text-navy-900 transition-all duration-200 bg-sky-200/10 hover:bg-sky-200/20 px-4 py-2 rounded-full hover:shadow-md hover:scale-105"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {backText}
          </Link>
        </div>
      </div>
    </main>
  );
}
