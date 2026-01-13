"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";

export default function PrivacyPolicyPage() {
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
            Privacy Policy (HireMe)
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
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">Introduction</h2>
              <p className="text-slate-700 leading-relaxed">
                HireMe LLC ("HireMe," "we," "us," or "our") values your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard personal information when you use our website and services (the "Platform"). It also describes your rights and choices regarding your information, including under the California Consumer Privacy Act (CCPA) as amended by the California Privacy Rights Act (CPRA). This Policy applies to all users of HireMe, including job seeker candidates ("Candidates") and employers or recruiters ("Employers"), within the United States. HireMe is a U.S.-based service and is intended for U.S. users only. If you do not agree with our practices, please do not use the Platform.
              </p>
              <p className="text-slate-700 leading-relaxed mt-4">
                By using HireMe, you acknowledge that you have read and understood this Privacy Policy. For purposes of applicable data protection laws, HireMe is the "business" or "controller" of your personal information (except in certain limited circumstances explained in this Policy or in a Data Processing Agreement for business clients). If you have any questions or concerns about this Policy or our data practices, please contact us at the information provided at the end of this document.
              </p>
            </section>

            {/* Section 1: Information We Collect */}
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">1. Information We Collect</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                We collect personal information that you provide to us directly, information generated from your use of our Platform, and information from third-party sources (in limited cases). The types of information we collect include:
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Information You Provide Directly</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                When you register or create a Candidate profile, we collect information such as your name, email address, phone number, mailing address, login credentials (username and password), and other account registration details. As a Candidate, you may provide professional information to populate your profile, such as your work history, education, skills, resume/CV, certifications, portfolio links, profile photograph, job preferences (e.g., desired roles or locations), and any other details you choose to share about your qualifications. If you contact us for support or apply for a job at HireMe, we will collect the information you provide in those communications (like your contact details and any additional information you submit).
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                If you are an Employer signing up for our services, we may collect your name, business contact information, company name, title/role, and any information related to your company's hiring needs or usage of the Platform. Employers may also provide information about job opportunities or search criteria that indirectly reveal personal preferences (e.g., desired skills, locations). Importantly, HireMe does not knowingly collect personal information from anyone under 18 years of age, and our Platform is restricted to users 18+. We do not solicit or knowingly receive any information from children or minors.
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Payment Information</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                If you are an Employer purchasing a subscription or paying a fee (Candidates are not charged fees), our third-party payment processor will collect your payment card details and billing information to process the transaction. HireMe itself does not store full payment card numbers; payment information is handled securely by a PCI-compliant payment processing service. We may retain a record of your purchase (e.g., subscription plan, amount, and date) and partial information (such as the last four digits of a card and billing address) for invoicing, receipts, and account history.
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Information Created or Collected Automatically</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                When you use the Platform (whether as a Candidate, Employer, or visitor), we automatically collect certain technical and usage data. This includes:
              </p>
              <ul className="list-disc list-inside space-y-3 text-slate-700 leading-relaxed ml-4 mb-4">
                <li><strong className="text-navy-900">Device and Log Information:</strong> IP address, browser type, device type (e.g., mobile or desktop), operating system, device identifiers, and settings. We log usage details such as page views, access times and dates, referring and exit pages, and clickstream data (e.g., which features you use and when).</li>
                <li><strong className="text-navy-900">Cookies and Tracking Technologies:</strong> We use cookies, web beacons, and similar technologies to collect information about your interactions with the Platform (see our Cookie Policy for details). This may include your preferences, authentication tokens (to keep you logged in), and analytics data about how you navigate and use our services.</li>
                <li><strong className="text-navy-900">Location Information:</strong> We may derive an approximate geographic location (city, state, country) from your IP address when you use the Platform. This is used for purposes like showing location-relevant content (for example, relevant job markets) or for fraud prevention and analytics. We do not collect or track precise GPS location from your device.</li>
              </ul>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Information from Third Parties</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                At this time, HireMe does not heavily rely on third-party data sources for personal information. In the future, if you choose to link or import data from other platforms (for example, if we enable an option to import your profile from LinkedIn or upload data from cloud storage), we would collect whatever information you authorize from those sources. Additionally, we may receive information about Platform usage or Candidates from service providers (such as analytics providers or identity verification providers, if we engage them) to help us improve the service and ensure trust and safety. For instance, if HireMe in the future partners with a background check service or uses a third-party to verify identities, we may receive confirmation of your identity or background screening results as permitted by law (this will be done only with your explicit consent if ever implemented). We will update our Privacy Policy to reflect any material changes in third-party data collection.
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                We may also collect or infer information from publicly available sources for business contact data (for example, we might find company contact information from a company's website or professional networking sites to invite new Employers to the Platform). We handle such business contact information in accordance with this Policy.
              </p>
            </section>

            {/* Section 2: How We Use Your Information */}
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">2. How We Use Your Information</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                HireMe uses personal information for the following business and commercial purposes (all of which are in service of operating, providing, and improving our Platform and services):
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Providing the Platform and Services</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                We use the information we collect to create and manage user accounts, enable profile creation, and facilitate the core functionality of HireMe. For Candidates, this means using your information to create your online profile, which can be viewed by Employers (and potentially by us or our service providers for moderation and support). For Employers, this means enabling search and contact functions to find suitable Candidates. We use contact information (like email and phone) to enable communications between Candidates and Employers and to send you notifications related to Platform activity (for example, alerts that you have received a new message or an Employer viewed your profile).
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Facilitating Employer-Candidate Connections</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                We may use data such as your profile information, job preferences, and activity to recommend or highlight your profile to prospective Employers, or to surface relevant Candidate profiles to Employers (for example, through search algorithms). We might also use your information to suggest potential matches or to send you suggestions for how to optimize your profile to attract more Employer interest.
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Platform Operations and Performance</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                We use technical and usage data (device information, log data, cookies) to ensure the Platform functions properly, to monitor and fix performance issues, and to secure the Platform. For instance, we may use your IP address and device information to protect against fraudulent or unauthorized activity, to debug software, and to manage load-balancing on our servers. Cookies also help with tasks like keeping you logged in during a session and remembering your preferences.
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Communication</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                We use your contact information to communicate with you about your account or use of the service. This includes sending administrative emails to confirm your registration, alert you to important account or security issues, or inform you of updates to our terms or policies. If you are a Candidate, we will also use your email (and/or other provided contact method) to send you communications that Employers initiate through the Platform (for example, if an Employer sends you a message or interview request on HireMe, we may forward that to your email to ensure you see it). Additionally, we may send you newsletters or marketing communications about platform features, new services, job search tips, or Employer opportunities that might interest you. You can opt out of marketing emails at any time by using the unsubscribe link or contacting us, but note that we will still send you transactional and service-related messages as needed.
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Improvement and Analytics</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                We continuously strive to make HireMe more effective and useful. We use usage data and analytics (often aggregated or de-identified) to understand how users interact with our Platform, which features are popular, how users navigate the site, and where improvements are needed. For example, we might analyze search query data to improve our candidate matching algorithms, or review user behavior to refine the user interface. We may use third-party analytics tools (like Google Analytics) that deploy their own cookies or identifiers to help us analyze usage; these providers only process data on our behalf and cannot use it for their own purposes except as permitted in their privacy policies (see Cookie Policy and any "Analytics" section below).
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Monetization and Business Model</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                HireMe may use and share Candidate information in order to monetize the Platform. Specifically, Candidate profiles and data are a core part of our service offering to Employers, who pay subscription fees or placement fees for access. By creating a profile, you acknowledge that your profile information (excluding your contact info, which is shared only when there is a legitimate contact or hire situation) will be made available to paying Employer users as part of our talent search database. We also reserve the right to share or license Candidate data to third parties in a manner compliant with applicable law, for purposes consistent with Candidates finding job opportunities or for other business purposes of HireMe. For instance, we might in the future partner with other recruiting platforms, academic or training institutions, or analytics firms and provide them with access to Candidate resumes or aggregated insights in exchange for compensation. If required by law (for example, if such sharing is considered a "sale" of personal information under CCPA), we will provide appropriate opt-out or consent mechanisms. HireMe may also display targeted content or job ads on the Platform using some of your profile characteristics (e.g., showing you opportunities in your field), although at present we do not host third-party advertising. Any such monetization will be done in a manner that respects user privacy and complies with applicable legal requirements (see Section 5 on Sharing for more details on how we share data).
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Customer Service and Support</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                If you reach out to us with a question, feedback, or request (such as reporting an issue or asking for assistance), we will use your provided information (like contact info and the content of your inquiry) to respond and resolve your issue. We may also use information about any technical issue you're experiencing to troubleshoot and improve our services.
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Legal Compliance and Security</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                We may process personal information to comply with legal obligations, to respond to subpoenas, court orders or legal process, and to enforce our Terms of Service or other agreements. We also process data as needed to detect, prevent, and address fraud, abuse, security incidents, and other harmful activity. For example, we might use certain usage patterns to detect accounts acting in bad faith, or we might retain logs to investigate a breach attempt. If we believe it is necessary, we may use and disclose personal information to investigate or prevent illegal activities, suspected fraud, situations involving potential threats to the safety or rights of any person, or as evidence in litigation in which we are involved.
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Business Transfers</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                We may use your information in connection with evaluating or executing a business transaction such as a merger, acquisition, financing, reorganization, bankruptcy, receivership, sale of company assets, or transition of service to another provider. In such cases, we may need to review and transfer your information as part of due diligence or as an asset in the transaction, subject to appropriate confidentiality protections.
              </p>

              <p className="text-slate-700 leading-relaxed mt-6 mb-4">
                We will not use personal information for purposes materially different from those disclosed in this Policy without your consent or an applicable legal basis. Where applicable law requires a specific legal basis for processing, our legal bases include: your consent (where given); performance of a contract (providing you the Platform per our Terms); our legitimate interests (such as improving the service, securing our platform, and marketing our services); and compliance with legal obligations.
              </p>
            </section>

            {/* Section 3: Cookies and Tracking Technologies */}
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">3. Cookies and Tracking Technologies</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                HireMe uses cookies and similar tracking technologies to collect and use personal information about you, including to serve interest-based advertising (if implemented) and for analytics. For detailed information about the cookies we use and your choices regarding cookies, please read our Cookie Policy (provided separately on our site).
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                In summary, cookies are small text files that websites store on a visitor's browser or device. We use cookies for several reasons:
              </p>
              <ul className="list-disc list-inside space-y-3 text-slate-700 leading-relaxed ml-4 mb-4">
                <li><strong className="text-navy-900">Necessary Cookies:</strong> These are essential for the Platform's functionality (for example, to keep you logged in, to remember your language or other preferences, or to enable you to move around the site and use its features). Without these, certain services may not be available.</li>
                <li><strong className="text-navy-900">Analytics Cookies:</strong> We use these to count visits and traffic sources, so we can measure and improve the performance of our site. They help us understand which pages or features are most and least popular and see how visitors move around the site. We may use Google Analytics or similar tools to assist with this. The information collected is typically aggregated and not identifiable to you.</li>
                <li><strong className="text-navy-900">Functionality Cookies:</strong> These cookies allow the site to remember choices you make (such as your preferences) to provide enhanced, more personalized features.</li>
                <li><strong className="text-navy-900">Advertising/Marketing Cookies:</strong> Currently, HireMe does not display third-party ads on our Platform. In the event we introduce advertising or sponsored content, we may use cookies or pixels to help deliver relevant ads to you and to measure their effectiveness. If this occurs, we will update this Policy and provide any required opt-outs (such as a "Do Not Sell or Share My Personal Information" link if required for California consumers, since sharing data for cross-context behavioral advertising could be considered a "share" under CPRA).</li>
              </ul>
              <p className="text-slate-700 leading-relaxed mb-4">
                <strong className="text-navy-900">Do-Not-Track Signals:</strong> Your browser or device may offer a "Do Not Track" (DNT) option; however, at this time, HireMe does not respond to DNT signals in a standardized way. We treat information of all users subject to this Policy, and use of cookies is governed as described above. California residents, please see the "CCPA/CPRA" section below for how to opt out of certain data uses.
              </p>
            </section>

            {/* Section 4: How We Share Your Information */}
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">4. How We Share Your Information</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                HireMe may share personal information with the following categories of recipients, for the business or commercial purposes described:
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Employer Users</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                The primary sharing of Candidate information is with Employers on our Platform. If you create a Candidate profile, the very purpose of the Platform is to make your profile visible to Employer subscribers who are seeking candidates. Thus, any information you include in your profile (such as your work experience, education, skills, and any contact information you choose to share) may be viewed by Employers. We may also share indicators of your activity or interest to Employers (for example, showing that you are "actively seeking opportunities" or that you recently updated your profile). Employers may also see any messages or communications you send them through the Platform. We impose contractual obligations on Employers through our Employer Terms of Service to use your information solely for legitimate hiring purposes and to protect its confidentiality, but note that once an Employer has your information, how they handle it will also be governed by their own policies. HireMe is not responsible for what Employers do with information after it has been provided to them through the Platform (though misuse would violate our terms with them, and we encourage you to report any abuse).
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Candidates (Limited)</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                Generally, Candidate personal profiles are not shared with other Candidates on the Platform; they are only accessible to Employers. However, certain elements like a success story or testimonial might be shared if you consent (for example, if you are hired and agree that we post a notice of "Congratulations to [Name] for being hired by [Employer] through HireMe!", we might share your name in a blog or social media post, but only with your permission). Additionally, aggregated information (e.g., "X% of candidates in our database have a Master's degree") might be visible publicly, but that will not identify you personally.
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Service Providers</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                We may share personal information with trusted third-party service providers or vendors who perform functions on our behalf and under our instructions. These include:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 leading-relaxed ml-4 mb-4">
                <li><strong className="text-navy-900">Hosting and Infrastructure Providers:</strong> (e.g., cloud hosting services like Amazon Web Services or similar) that store our data and ensure our website runs reliably.</li>
                <li><strong className="text-navy-900">Email and Communications Providers:</strong> services that help us send emails, notifications, or SMS messages to users (for instance, a service to send out bulk emails like password resets or marketing emails).</li>
                <li><strong className="text-navy-900">Payment Processors:</strong> (e.g., Stripe, PayPal, or similar) that handle credit card transactions for Employer subscriptions and fees. These processors are responsible for the security of payment data and only use it for payment processing purposes.</li>
                <li><strong className="text-navy-900">Analytics and Performance Tools:</strong> third parties that assist us in collecting and analyzing usage statistics and improving performance (such as Google Analytics). They may set cookies or use similar technologies on our site (see Cookie Policy), but they only receive pseudonymized or aggregated information in most cases.</li>
                <li><strong className="text-navy-900">Customer Support Tools:</strong> software or agencies that help us manage customer inquiries, support tickets, or chat communications.</li>
                <li><strong className="text-navy-900">Future Vendors:</strong> If we implement features like background checks or identity verification, we may share certain information (like your name or ID details) with those third-party services at your direction or with your consent, to carry out the check.</li>
              </ul>
              <p className="text-slate-700 leading-relaxed mb-4">
                When we engage service providers, we require them to use personal information only for the purpose of providing the specific services to us, and not for their own independent purposes. We also require them to protect the confidentiality and security of the personal information.
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Business Partners and Third Parties for Collaboration or Resale</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                HireMe reserves the right to broadly share and monetize candidate information, in line with the consent you give through this Privacy Policy and our Terms. This could include, for example, sharing some Candidate data with third-party recruiters or partner platforms to increase your exposure to job opportunities. It could also include selling access to our database (or portions of it) to vetted partners for approved uses. For instance, we might enter into a partnership with a recruitment agency or a job board where they pay us to access certain candidate resumes. In such cases, we would ensure any third party is under obligations to use the data for legitimate hiring-related purposes and not for spamming or unrelated marketing. If required by law, we will treat such sharing as a "sale" of personal information and honor your opt-out requests (see CCPA Addendum below).
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                At present (launch), HireMe is not engaged in significant data-sharing ventures beyond providing data to Employers on the Platform. However, our business model may evolve, and this Policy will be updated accordingly. If you are uncomfortable with the broad sharing described, you should not post sensitive information on your profile, and you may exercise applicable rights to limit certain processing (e.g., a California opt-out of sale, or simply close your account).
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Advertising Partners</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                As of now, we do not share personal data with third-party advertisers for their direct marketing purposes, other than perhaps using anonymized lists to target similar users on ad platforms (e.g., using a hashed list of user emails to target ads on social media, which doesn't reveal those emails to others). If we later partner with ad networks or social media platforms to promote HireMe or allow them to collect info via our site, we will disclose that and ensure applicable opt-outs. For example, we might in the future use a Facebook Pixel on our site to track conversions of our own ads. That could be considered a "share" for cross-context behavioral advertising under CPRA, in which case we'd include that in the opt-out mechanism.
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Legal and Compliance</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                We may disclose personal information as required by law, or when we believe in good faith that disclosure is necessary to (i) comply with a legal obligation (such as responding to subpoenas, warrants, or court orders); (ii) protect our rights, property, or safety, or that of our users, our employees, or the public; (iii) investigate or prevent fraud or abuse on our Platform; or (iv) enforce our Terms of Service or other agreements or policies. This could mean providing information to law enforcement, regulators, or legal counsel. We will carefully review requests to ensure they have valid legal basis before disclosing information, and will object to overly broad or invalid requests as appropriate. Where allowed, we may notify users of requests for their information.
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Business Transfers</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                As noted earlier, if HireMe is involved in a merger, acquisition, financing due diligence, reorganization, bankruptcy, receivership, sale of company assets, or transition of service to another provider, your information may be disclosed to an acquirer, successor, or assignee as part of that process. Any such entity will generally be bound by confidentiality obligations, and we will require that your personal information be handled in accordance with this Policy (unless and until the Policy is updated or you are notified otherwise). Your information (including personal data collected per this Policy) may be among the assets transferred in an acquisition or merger. You acknowledge that such transfers may occur and are permitted by this Privacy Policy.
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Aggregated or De-Identified Data</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                We may share information that has been aggregated (grouped together) or de-identified (stripped of personal identifiers) such that it cannot reasonably be used to identify an individual. This type of data is not considered personal information under many laws. For example, we might publish reports or share statistics with third parties that show hiring trends, average salaries in certain industries (if we gather that data), platform usage patterns, etc. This information will not include any personal details that identify you.
              </p>
            </section>

            {/* Section 5: Your Choices and Rights */}
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">5. Your Choices and Rights</h2>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Account Profile Settings</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                You can access, update, or correct most of your profile information by logging into your HireMe account and editing your profile or account settings. It is your responsibility to keep your personal information up-to-date. You may also control certain visibility settings (for instance, we may provide an option to set your profile to "active/visible" or "inactive/hidden" to Employers). If you choose to hide or deactivate your profile, Employers will not be able to view it, but HireMe will retain your data until you delete it or as otherwise allowed.
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Communication Preferences</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                As mentioned, you may opt out of receiving promotional or marketing emails from HireMe by following the unsubscribe instructions in those emails or contacting us. However, you will continue to receive service-related emails that are necessary for account administration or legal purposes (e.g., password resets, important account notices).
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Do Not Sell or Share / Opt-Out</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                If you are a California resident or otherwise entitled to opt out of the "sale" or "sharing" of your personal information, please see the California Privacy Addendum below for information on how to exercise that right. In short, HireMe provides California consumers the right to opt out of the sale of their personal info or sharing for targeted advertising. If our Platform is purely U.S.-only and not engaged in selling in the conventional sense, this may be largely applicable only if we were to share data with third parties for marketing or if Employers' access is deemed a "sale." We will treat any broad sharing of candidate info in exchange for value as a potential sale under CCPA, and you can opt out by contacting us at privacy@hireme.com with the subject "Do Not Sell My Info" or using an available tool on our site (e.g., a "Do Not Sell or Share" link, if provided). Once we receive and confirm an opt-out request, we will refrain from selling or sharing your personal information unless you later provide authorization to do so.
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Access, Correction, Deletion, and Other Rights</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                Depending on your jurisdiction, you may have certain legal rights with respect to your personal information. These can include:
              </p>
              <ul className="list-disc list-inside space-y-3 text-slate-700 leading-relaxed ml-4 mb-4">
                <li><strong className="text-navy-900">Right to Know/Access:</strong> The right to request that we disclose what personal information we have collected about you, including the categories of data, the sources, purposes, and with whom we share it. California residents have this right under CCPA, as do users in some other states (with variations).</li>
                <li><strong className="text-navy-900">Right to Request Deletion:</strong> The right to request that we delete personal information we collected from you, subject to certain exceptions (for example, we may retain data if necessary to complete a transaction you requested, for security, legal compliance, or internal uses that are reasonably aligned with your expectations and the context in which you provided it).</li>
                <li><strong className="text-navy-900">Right to Correct:</strong> The CPRA grants California residents the right to request correction of inaccurate personal information. We already allow you to correct most info via your account, but you can also ask us to correct any info you cannot change yourself.</li>
                <li><strong className="text-navy-900">Right to Opt-Out of Selling/Sharing:</strong> Discussed above — applicable if we engage in those activities.</li>
                <li><strong className="text-navy-900">Right to Limit Use of Sensitive Information:</strong> California residents can direct businesses to limit certain uses of "sensitive personal information." HireMe does not collect sensitive personal data like Social Security numbers, financial account info, precise geolocation, etc., except possibly if you voluntarily include sensitive details on your resume. We do not use any sensitive info we might have beyond what's necessary for providing the services (e.g., if you list your racial identity on a resume, we do not separately process that for any secondary purpose).</li>
                <li><strong className="text-navy-900">Right of Non-Discrimination:</strong> We will not discriminate against you for exercising any privacy rights. That means, for instance, if you opt out of sale or request deletion, we will not deny you services or provide a different quality of service, except as permitted by law (note: if you ask us to delete your data, that may inherently mean we cannot provide full services, e.g., an Employer cannot find you if your profile is gone — but we will not otherwise retaliate).</li>
              </ul>
              <p className="text-slate-700 leading-relaxed mb-4">
                To exercise any applicable rights, you (or an authorized agent acting on your behalf) should submit a request to us using the contact methods in Section 8 or as described in the CCPA/CPRA Addendum. We may need to verify your identity before fulfilling a request (for example, by confirming you have control over the email associated with your account or asking for additional info). We will respond within the timeframe required by law (generally within 45 days for California requests, with the possibility of an extension). If we decline your request (due to an exemption or inability to verify your identity), we will explain the reason to the extent required.
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Account Deletion</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                If you wish to close your account, you can likely do so via your profile settings or by contacting support. Closing your account will remove your profile from view. We will delete or de-identify your personal information, except for data we are required or permitted to keep as described in Section 6 below. Please note that search engines or other caching mechanisms may retain copies of your public profile (if any portion was public) for a time, and we do not control third-parties that have been provided your info (for instance, an Employer who already downloaded your resume). We encourage Candidates to directly notify Employers who contacted them if they no longer wish to be considered or contacted.
              </p>
            </section>

            {/* Section 6: Data Retention */}
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">6. Data Retention</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                HireMe retains personal information for as long as necessary to fulfill the purposes for which it was collected, as outlined in this Policy, and for any additional period that may be required or permitted by law. The exact retention period will depend on the type of information and the context in which it was collected:
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Active Accounts</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                If you have an active Candidate account, we retain your profile information on our systems until you choose to delete it or modify it. Because the purpose of HireMe is to connect Candidates with Employers, we keep your data so long as you maintain an account to continue providing you the service. We may periodically encourage you to update your information or confirm that you're still looking for opportunities. If you become inactive (e.g., you have not logged in for a long period), we might flag your account as inactive. Even if inactive, we typically will not delete your profile unless you request it, because you may return, but we might remove it from visible search results over time.
              </p>

              <h3 className="text-xl font-semibold text-navy-900 mt-6 mb-3">Account Deletion</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                When you delete your account (or request deletion), we will remove your profile from the Platform and either delete or anonymize your personal information so that you can no longer be identified. In general, we aim to complete deletion requests promptly upon verification. However, we may retain certain limited information after account deletion for specific reasons:
              </p>
              <ul className="list-disc list-inside space-y-3 text-slate-700 leading-relaxed ml-4 mb-4">
                <li><strong className="text-navy-900">Transactional Records:</strong> If you engaged in a transaction on the Platform (e.g., an Employer paid a fee, or in a future scenario a Candidate purchased a service), we may keep records of those transactions for financial reporting and compliance (e.g., maintaining receipts or invoices as required by tax law).</li>
                <li><strong className="text-navy-900">Legal Obligations:</strong> We might retain data if needed to comply with legal obligations (for instance, retaining information related to a complaint, subpoena, or an ongoing legal claim, or retention required by financial regulations).</li>
                <li><strong className="text-navy-900">Security and Fraud Prevention:</strong> We may retain information necessary for detecting/preventing fraud or security issues. For example, we might keep a record of an account that was terminated for misconduct to prevent that user from re-registering, or keep logs of system access to investigate possible breaches.</li>
                <li><strong className="text-navy-900">Backup Systems:</strong> Removed data may persist in routine backups for a short period. Our backup and archival systems may retain information for a certain retention cycle (often 30-90 days) before they are overwritten. We will take reasonable steps to ensure that data is not restored or accessed from backups after deletion beyond this retention window.</li>
                <li><strong className="text-navy-900">Anonymized Data:</strong> As noted, we may convert your data into aggregated or de-identified form. If we have done so, we may retain and use that information indefinitely, as it no longer identifies you.</li>
              </ul>
              <p className="text-slate-700 leading-relaxed mb-4">
                We also maintain records of communication opt-outs to ensure we honor those going forward (for example, if you unsubscribe from emails, we keep your email on a suppression list).
              </p>
            </section>

            {/* Section 7: Security Measures */}
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">7. Security Measures</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                HireMe takes the security of personal information seriously. We implement reasonable and appropriate technical, administrative, and physical security measures designed to protect your information from unauthorized access, disclosure, alteration, and destruction. These measures include encryption of data in transit (e.g., using HTTPS for our website), encryption of sensitive data at rest where appropriate, firewalls and access controls for our servers, regular security assessments, and limiting access to personal data only to those employees, contractors, and service providers who need to know it to perform their job duties.
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                However, please note that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to protect your personal information, we cannot guarantee absolute security. You should also take steps to protect your information: for example, choose a strong, unique password for your account, do not share your login credentials, and notify us immediately if you suspect any unauthorized access to your account. If there is a security breach that affects your personal information, we will notify you and/or the appropriate authorities as required by applicable law.
              </p>
            </section>

            {/* Section 8: International Data Transfers */}
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">8. International Data Transfers</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                HireMe is based in the United States and our Platform is intended for users located in the U.S. If you are accessing the Platform from outside the U.S., please be aware that your information will be transferred to, stored, and processed in the United States (or other jurisdictions where our servers or service providers are located). By using our services, you acknowledge that your personal data may be transferred to and processed in the U.S., which may have different data protection laws than in your country of residence. We will take steps to ensure that your data is subject to appropriate safeguards in the destination country, but if you are in a jurisdiction (like the EU or UK) that imposes specific requirements on data export, you should not use HireMe at this time, as we have not implemented cross-border transfer mechanisms (we currently restrict our service to U.S. use).
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                In the event that we do serve users outside the U.S. or if we engage in data transfers from, say, the European Economic Area or UK to the U.S., we will comply with applicable data transfer requirements, such as implementing Standard Contractual Clauses or other lawful transfer mechanisms, and we will update this Policy accordingly.
              </p>
            </section>

            {/* Section 9: Additional Notices & Compliance */}
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">9. Additional Notices & Compliance</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                This Policy is designed to meet requirements of U.S. law, including CCPA/CPRA for California residents and other similar state laws. We also aim to adhere to fair information practice principles generally. Below, we provide an additional notice for California residents, which supplements this Policy with more specific information as required by law.
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                We also note: because our service is 18+ only, we are not subject to the Children's Online Privacy Protection Act (COPPA) and do not collect information from children under 13. Additionally, since we do not provide educational services or handle education records from educational institutions, FERPA (Family Educational Rights and Privacy Act) does not apply to our handling of any education-related info that Candidates might self-report. If you provide us with any information from a third party, you must ensure you have the right to do so (for example, if an Employer provides personal data about a reference or another employee, they should have that person's permission).
              </p>
            </section>

            {/* Section 10: Updates to this Privacy Policy */}
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">10. Updates to this Privacy Policy</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                We may update this Privacy Policy from time to time to reflect changes in our practices, technologies, legal requirements, or for other operational reasons. If we make material changes, we will notify you by posting the updated Policy on our website with a new effective date, and/or by sending a notice to the contact information we have on file for you (if you have an account). Your continued use of the Platform after such update constitutes your acceptance of the revised Privacy Policy. We encourage you to review this Policy periodically to stay informed about how we protect your information.
              </p>
            </section>

            {/* Section 11: Contact Us */}
            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">11. Contact Us</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 mb-4">
                <p className="text-slate-700 leading-relaxed">
                  <strong className="text-navy-900">HireMe LLC</strong><br />
                  Privacy Department<br />
                  Email: <a href="mailto:officialhiremeapp@gmail.com" className="text-navy-800 hover:text-navy-700 underline">officialhiremeapp@gmail.com</a>
                </p>
              </div>
              <p className="text-slate-700 leading-relaxed mb-4">
                We will address your inquiry as promptly as possible, and in any event, within any timeframes required by law.
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
