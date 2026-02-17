"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";

export default function CandidateTermsOfServicePage() {
  const { user, profile } = useFirebaseAuth();
  
  const dashboardLink = profile?.role === 'JOB_SEEKER' 
    ? '/home/seeker' 
    : profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER'
    ? '/home/employer'
    : '/';
    
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-sm z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-navy-900 font-bold text-xl">
            HireMe
          </Link>
          <Link 
            href={dashboardLink}
            className="flex items-center text-navy-800 font-semibold hover:text-navy-900 transition-all duration-200 bg-sky-200/10 hover:bg-sky-200/20 px-3 sm:px-4 py-2 rounded-full w-fit min-h-[44px] text-sm sm:text-base hover:shadow-md hover:scale-105"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        {/* Page Header */}
        <div className="mb-8 lg:mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-navy-900 mb-4 tracking-tight">
            Terms of Service (Candidates)
          </h1>
          <p className="text-slate-600 text-lg">
            Last Updated: January 10, 2026
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8 lg:p-10 prose prose-slate max-w-none">
          <div className="space-y-8">
            <section>
              <p className="text-slate-700 leading-relaxed">
                Welcome to HireMe. These Terms of Service ("Terms") are a legal agreement between you and HireMe LLC ("HireMe," "we," "us," or "our"), governing your use of the HireMe website, platform, and services (collectively, the "Platform"). By accessing or using the Platform, you agree to be bound by these Terms and our Privacy Policy and Cookie Policy (collectively, the "Agreement"). If you do not agree, do not use HireMe.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">Eligibility</h2>
              <p className="text-slate-700 leading-relaxed">
                You must be at least 18 years old (or the age of majority in your jurisdiction) to use HireMe. By using the Platform, you represent and warrant that you are 18 or older and legally capable of entering into this Agreement. The Platform is intended for adults seeking employment opportunities; we do not knowingly permit users under 18, and no information from minors is collected.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">Account Registration</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                Creating a Candidate profile ("Account") may be required to access certain features. You agree to provide accurate, current, and complete information during registration and to keep your information updated. Each user may maintain only one Candidate Account, and you will not create an Account for anyone other than yourself. You are responsible for maintaining the confidentiality of your login credentials and all activities that occur under your Account. If you suspect unauthorized use of your Account, you must notify HireMe immediately. We are not liable for any loss or damage arising from unauthorized access to your Account (except to the extent caused by our negligence).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">Platform Description</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                HireMe is a reverse-hiring software-as-a-service platform that allows individual job seekers ("Candidates") to create personal profiles showcasing their qualifications, and allows registered employers ("Employers") to search for, communicate with, and potentially hire Candidates. Candidates use HireMe for free; HireMe's services are funded by Employer subscriptions and per-hire fees. HireMe's role is solely to facilitate initial contact and information exchange between Candidates and Employers. HireMe is not an employer, recruiting agency, or party to any employment contract between a Candidate and an Employer. All hiring decisions, job offers, and any employment or independent contractor agreements are made strictly between the Employer and the Candidate, outside of the Platform. HireMe does not guarantee that using the Platform will result in employment, job offers, or any specific outcomes, and you acknowledge that HireMe does not guarantee any job placement or the suitability of any Employer or opportunity.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">User Content and Profile Information</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                As a Candidate, you may upload or provide personal information, resume/CV data, work experience, education, images, and other content ("User Content") to create a profile on HireMe. You retain ownership of your User Content. However, by submitting or posting User Content on the Platform, you grant HireMe a worldwide, royalty-free, sublicensable license to use, reproduce, distribute, prepare derivative works of, and display your User Content as needed to operate and promote the Platform and services. This includes making your profile and information available to Employers (who may be paying subscribers) and other third parties for purposes of connecting you with job opportunities or related services.
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                <strong className="text-navy-900">Privacy:</strong> You agree that HireMe may process and share your information as described in our Privacy Policy, and you consent to such processing and sharing, including potentially broad distribution or monetization of your profile data in connection with the service's business model. If you do not want your profile or personal data shared with prospective Employers or partners, do not use HireMe. We will respect any rights you have under applicable law to limit certain uses of your data (see Privacy Policy for opt-out rights).
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                By providing User Content, you represent and warrant that: (a) you have all necessary rights to provide that content and to grant the above license; (b) all information you submit is truthful and accurate (e.g. you will not post false qualifications or impersonate anyone); and (c) your User Content and use of the Platform will not violate any law or these Terms. HireMe is not responsible for the content of any user profiles except to the extent required by law; we do not generally verify the accuracy of Candidate-provided or Employer-provided information. You are solely responsible for your User Content. We may (but are not obligated to) review, monitor, remove, or edit any User Content at our discretion if we believe it violates these Terms or applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">Permissible Use and Conduct</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                You agree to use HireMe solely for your personal job-seeking purposes and in a manner consistent with all applicable laws and regulations. Prohibited activities on the Platform include, but are not limited to, the following:
              </p>
              <ul className="list-disc list-inside space-y-3 text-slate-700 leading-relaxed ml-4">
                <li>
                  <strong className="text-navy-900">Unlawful or Harmful Use:</strong> You will not use the Platform for any unlawful purpose or to promote any illegal activities. You will not post content that is defamatory, fraudulent, obscene, harassing, violent, hateful, or otherwise objectionable (including content that promotes bigotry, discrimination, or racism). You will not engage in abusive or disruptive behavior toward Employers, other users, or HireMe staff.
                </li>
                <li>
                  <strong className="text-navy-900">Misrepresentation and Impersonation:</strong> You will not provide false, misleading, or deceptive information on your profile or in communications. You will not impersonate any person or entity or misrepresent your identity or affiliations.
                </li>
                <li>
                  <strong className="text-navy-900">Privacy and Data Scraping:</strong> You will not scrape, harvest, or collect data from the Platform by automated means (such as bots, crawlers, or scripts) without our prior written permission. You will not use another's personal data obtained from the Platform for any purpose other than evaluating or engaging in bona fide employment opportunities. For example, you will not use Employer contact information to send unsolicited marketing, and you will not misuse Candidate or Employer information in violation of privacy laws.
                </li>
                <li>
                  <strong className="text-navy-900">Interference and Security:</strong> You will not interfere with or disrupt the operation of the Platform or the servers and networks used to make the service available. This includes not uploading any malware, viruses, worms, or harmful code. You will not attempt to probe or breach any security or authentication measures of the Platform.
                </li>
                <li>
                  <strong className="text-navy-900">Commercial Exploitation:</strong> You will not resell or commercially exploit access to the Platform, and you will not use the Platform to advertise or solicit services or products (except that Employers may offer bona fide jobs to Candidates). As a Candidate, you will use the Platform for your personal job search only, and not on behalf of any third party or for any competitor of HireMe.
                </li>
                <li>
                  <strong className="text-navy-900">Circumvention of Platform:</strong> You will not knowingly engage in any activity intended to circumvent the Platform's processes or fees. If you are connected with an Employer through HireMe, you agree to communicate and conduct the recruitment process in good faith via the Platform unless and until the Employer properly fulfills any required Platform fee for hiring (if applicable). You will not encourage or assist any Employer to hire you outside the Platform to avoid fees owed to HireMe. If an Employer you met on HireMe proposes or pressures you to pursue the opportunity off-platform in order to circumvent HireMe, you agree to notify HireMe. Note: While as a Candidate you are not charged fees, any circumvention undermines the Platform; participation in a deliberate circumvention scheme may result in account termination for both you and the Employer.
                </li>
              </ul>
              <p className="text-slate-700 leading-relaxed mt-4">
                HireMe reserves the right to investigate and take appropriate action for any suspected violation of the above, including removing content, suspending or terminating accounts, and reporting misconduct to law enforcement or other authorities as appropriate.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">Fees</h2>
              <p className="text-slate-700 leading-relaxed">
                The Platform is free for Candidate users. HireMe does not charge Candidates any fee to create an account or to be contacted by Employers. (Employers pay subscription or placement fees to access the candidate database and to hire Candidates.) You understand and agree that you will never be asked by HireMe to pay for job placement, and if any party (including an Employer) attempts to charge you fees related to a HireMe-facilitated opportunity, you should report it to HireMe. HireMe may offer optional paid services for Candidates in the future (for example, resume writing or premium features), but any such services and their fees would be described and offered to you separately, and are not required to use the core Platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">Interactions with Employers</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                The Platform enables Employers to find and contact Candidates. Any communications, interviews, offers, or employment contracts resulting from these interactions are solely between you and the Employer. HireMe is not directly involved in any hiring decision or subsequent employment relationship. We do not guarantee the identity, legitimacy, or credentials of any Employer, nor the validity of any job offer. While we may conduct certain screenings or monitoring of Employer accounts, you should exercise appropriate caution and do your own evaluation when responding to communications or offers.
              </p>
              <p className="text-slate-700 leading-relaxed">
                Be aware that an Employer's job offer terms (such as salary, benefits, work conditions) are not controlled or verified by HireMe. You are responsible for vetting any potential Employer and understanding the terms of any employment you accept. HireMe disclaims any liability for the actions or omissions of Employers, or for any issues arising from the employment process or employment itself. This includes, without limitation, any false information an Employer provides, any breach of an employment agreement by an Employer, or any harm or losses you suffer in the course of a job obtained through HireMe. If you suspect an Employer of violating our terms (for example, engaging in discriminatory practices or scams), please notify HireMe so we can review and take appropriate action.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">No Guarantee of Opportunities</h2>
              <p className="text-slate-700 leading-relaxed">
                HireMe strives to facilitate productive connections, but we do not guarantee that you will receive any minimum number of contacts or messages from Employers, or any job offers, through the Platform. We also do not guarantee the availability of any specific Employer or that any Employer will view your profile. The hiring market can be competitive and factors outside our control (such as an Employer's hiring criteria or market conditions) will affect outcomes. You acknowledge that HireMe's service is limited to providing a platform and tools, and that the outcome of your job search depends on your own credentials and the decisions of Employers, not on HireMe.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">Communications and Notifications</h2>
              <p className="text-slate-700 leading-relaxed">
                By creating an Account, you consent to receive communications from HireMe electronically, via email or through the Platform (e.g., system notifications or messages about new Employer contacts). You also consent to receive communications from Employers through the Platform (which may be forwarded to your email address on file). We may send you service announcements, administrative messages, and other information as part of the normal operation of the Platform. You may opt out of certain types of communications (e.g. marketing emails) as described in the Privacy Policy, but you cannot opt out of essential Platform communications (like account or legal notices) while you have an Account. Standard messaging and data rates may apply for any SMS/text messages, if you opt to receive text notifications.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">Platform Availability</h2>
              <p className="text-slate-700 leading-relaxed">
                We aim to keep the Platform running smoothly and accessible. However, we do not guarantee 100% uptime or uninterrupted service. There may be occasional maintenance, updates, or technical issues that disrupt or limit the Platform's functionality. We will try to provide advance notice of scheduled downtime, but reserve the right to perform emergency maintenance without notice. HireMe is not liable for any unavailability of the Platform or any loss of data or opportunities that may result from scheduled or unscheduled downtime, technical malfunctions, or events beyond our control.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">Third-Party Links and Services</h2>
              <p className="text-slate-700 leading-relaxed">
                The Platform may contain links to third-party websites or resources, or Employers may share such links in communications (for example, a link to an Employer's corporate site or application form). HireMe is not responsible for the content, products, services, or practices of any third-party websites or resources. If you access third-party links, you do so at your own risk. We encourage you to review the terms and privacy policies of any third-party sites you visit. HireMe's inclusion of a link does not imply an endorsement of the third party. You agree that HireMe has no liability for any loss or damage of any sort incurred from your dealings with third parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">Termination of Account</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                You may terminate your Candidate account at any time by using any account deletion feature on the Platform or by contacting us to request deletion. We will process such requests as described in the Privacy Policy (typically by deactivating your profile and deleting personal data, except as retained for legal or business purposes).
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                HireMe reserves the right, at our sole discretion, to suspend or terminate your Account or access to the Platform at any time for any reason, with or without notice. This includes, without limitation, termination for violation of these Terms, violation of any applicable law or regulation, engaging in misconduct on the Platform, providing false information, or any behavior that we determine is harmful to the Platform or other users. In non-emergency situations, we will endeavor to provide a warning or explanation for suspension/termination, but we are not obligated to do so in all cases.
              </p>
              <p className="text-slate-700 leading-relaxed">
                If your Account is terminated (by you or by us), the Agreement between you and HireMe is also terminated, except that any provisions of these Terms that by their nature should survive termination (such as disclaimers of liability, indemnification, dispute resolution, and others listed under Survival below) will continue to apply. After termination, you will no longer have access to the Platform or your data within it (subject to our data retention policies). HireMe has no obligation to provide you with a copy of your data after termination, so you are responsible for retaining copies of any information you wish to keep (e.g., your profile content or messages) outside the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">Disclaimer of Warranties</h2>
              <p className="text-slate-700 leading-relaxed">
                HireMe provides the Platform "AS IS" and "AS AVAILABLE," without any warranties of any kind. To the maximum extent allowed by law, HireMe disclaims all express or implied warranties, including but not limited to implied warranties of accuracy, reliability, suitability, truthfulness, merchantability, fitness for a particular purpose, title, and non-infringement. We do not warrant that the Platform will meet your specific needs or expectations, that any results or employment will be obtained, or that the Platform will be error-free or secure. HireMe makes no representations or guarantees regarding the effectiveness of the Platform or the hiring ability of Employers, the truth or accuracy of any user content (including Candidate profiles or job information provided by Employers), or the ability of any Employer to hire or pay you. Any advice or information obtained from HireMe or through the Platform (whether oral or written) does not create any warranty not expressly stated in these Terms. You assume all risk for any decisions made or actions taken based on information obtained through the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">Limitation of Liability</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                To the fullest extent permitted by applicable law, HireMe will not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenues, opportunities, data, goodwill, or other intangible losses, arising out of or related to your use of (or inability to use) the Platform or any interactions with Employers or other users. This limitation applies regardless of whether such damages are claimed under contract, tort (including negligence), strict liability, or any other theory, and even if HireMe has been advised of the possibility of such damages.
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                In particular, HireMe is not liable for: (a) any acts or omissions of Employers or other third parties, including any hiring decisions or employment practices (e.g., if an Employer violates anti-discrimination laws or fails to follow through on an offer, we are not responsible); (b) any misinformation or inaccuracy in user-provided content (e.g., if a Candidate or Employer provides false information); (c) any unauthorized access to or use of our servers and/or any personal information stored therein, unless due to our failure to implement reasonable security measures; (d) any cessation or interruption of transmission to or from the Platform; or (e) events beyond our reasonable control, such as power outages, natural disasters, internet failures, or acts of government.
              </p>
              <p className="text-slate-700 leading-relaxed">
                <strong className="text-navy-900">Maximum Liability:</strong> In all cases, HireMe's aggregate liability to you for any and all claims arising from or related to the Platform or this Agreement will not exceed the greater of US $100 or the total amount (if any) you paid to HireMe for services in the past six months. Since Candidates use the Platform for free, by default our liability is capped at $100. This cap is an essential part of the bargain between you and us, and would apply even if any limited remedy in this Agreement is found to have failed its essential purpose. Some jurisdictions do not allow certain liability exclusions or limits; in those jurisdictions, our liability will be limited to the maximum extent permitted by law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">Indemnification</h2>
              <p className="text-slate-700 leading-relaxed">
                You agree to indemnify, defend, and hold harmless HireMe and its affiliates, and each of their officers, directors, employees, agents, and representatives, from and against any and all claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) that arise out of or relate to: (a) your use or misuse of the Platform; (b) your User Content or any information you provide; (c) your violation of this Agreement or of any law or regulation; or (d) any actual or alleged infringement or misappropriation of third-party rights (including intellectual property or privacy rights) by your User Content or conduct. HireMe reserves the right, at our own expense, to assume the exclusive defense and control of any matter otherwise subject to indemnification by you (in which case you agree to cooperate with HireMe in asserting any available defenses). This indemnity obligation survives any termination of your Account or this Agreement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">Dispute Resolution & Arbitration</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                <strong className="text-navy-900">Please read this section carefully. It affects your legal rights by requiring arbitration of disputes and waiving certain rights to trial and class actions.</strong>
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                <strong className="text-navy-900">Initial Dispute Resolution:</strong> Most concerns can be resolved quickly by contacting us at support@hireme.com. You agree to try in good faith to resolve any dispute or claim you have with HireMe through informal negotiation within 30 days before initiating formal action.
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                <strong className="text-navy-900">Binding Arbitration:</strong> If we cannot resolve a dispute informally, you and HireMe agree that any dispute, claim, or controversy arising out of or relating to this Agreement or your use of the Platform (collectively, "Disputes") shall be resolved by binding arbitration on an individual basis, except as set forth under "Exceptions" below. This includes claims based in contract, tort, statute, fraud, misrepresentation, or any other legal theory. You understand and agree that, by entering into this Agreement, you and HireMe are each waiving the right to a trial by jury or to participate in a class or representative action for all Disputes, to the fullest extent permitted by law.
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                <strong className="text-navy-900">Arbitration Procedures:</strong> The arbitration will be administered by the American Arbitration Association (AAA) under its applicable rules (if you are an individual using the Platform for personal job-seeking, the AAA Consumer Arbitration Rules will apply; if not, the AAA Commercial Arbitration Rules may apply). You can find the AAA rules at the AAA website. To initiate arbitration, you must send a written demand for arbitration to HireMe's registered address (see "Contact Us" below) and to the AAA. The arbitration will be conducted by a single neutral arbitrator. Arbitration may be conducted remotely (e.g., by telephone or video conference) or, if in-person, in Arlington County, Virginia, or another mutually agreed location. The arbitrator will have authority to award any relief that a court of competent jurisdiction could, including individual injunctive relief and attorneys' fees when authorized by law. The arbitrator's award will be final and binding, and judgment on it may be entered in any court of competent jurisdiction.
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                <strong className="text-navy-900">Fees:</strong> The payment of any filing, administrative, and arbitrator fees will be governed by the AAA's rules. If you are an individual using the Platform for personal purposes, we will pay all such fees to the extent required by law or to make arbitration accessible (for example, if the AAA Consumer Rules apply, we will usually pay or reimburse arbitration fees beyond the initial filing fee). We will not seek attorneys' fees from you in arbitration unless the arbitrator determines your claims are frivolous or brought in bad faith.
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                <strong className="text-navy-900">Exceptions:</strong> Notwithstanding the above, either you or HireMe may choose to bring an individual action in a U.S. small claims court (e.g., for disputes that qualify for small claims in a court that has jurisdiction) instead of proceeding with arbitration. Additionally, either party may seek urgent equitable relief (such as a temporary restraining order or preliminary injunction) in a court of proper jurisdiction if necessary to prevent immediate irreparable harm, without first engaging in arbitration. Such a request for interim relief will not be deemed a waiver of the obligation to arbitrate the merits of the dispute.
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                <strong className="text-navy-900">Opt-Out Right:</strong> You may opt out of this arbitration agreement by sending a written notice of your decision to opt out to legal@hireme.com or to our physical address (Attn: Legal Department) within 30 days of first accepting these Terms. The opt-out notice must include your name, address, the email associated with your HireMe account, and a clear statement that you want to opt out of arbitration. If you opt out, or in the event the arbitration agreement is found unenforceable by a court, you and HireMe agree that all Disputes will be resolved exclusively in a state or federal court located in the Commonwealth of Virginia, and you consent to venue and personal jurisdiction in Virginia.
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                <strong className="text-navy-900">Class Action Waiver:</strong> You and HireMe agree that any Dispute resolution proceedings (whether in arbitration or court) will be conducted only on an individual basis and not in a class, consolidated, or representative action. You further agree that the arbitrator or court may not consolidate more than one person's claims and may not otherwise preside over any form of a representative or class proceeding. If this class action waiver is found unenforceable, then the entirety of the arbitration agreement above shall be null and void (but the rest of these Terms will remain in effect).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">Governing Law</h2>
              <p className="text-slate-700 leading-relaxed">
                This Agreement and any Dispute between you and HireMe shall be governed by and construed in accordance with the laws of the Commonwealth of Virginia and applicable U.S. federal law, without regard to its conflict of laws principles, except to the extent that the Federal Arbitration Act governs the enforceability of the arbitration provision above.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">Severability</h2>
              <p className="text-slate-700 leading-relaxed">
                If any provision of these Terms is held to be invalid or unenforceable by an arbitrator or court of competent jurisdiction, that provision will be deemed modified to the minimum extent necessary to make it enforceable (or, if not possible, severed), and the remaining provisions of this Agreement will remain in full force and effect.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">No Waiver</h2>
              <p className="text-slate-700 leading-relaxed">
                HireMe's failure to enforce any right or provision of these Terms shall not constitute a waiver of that right or provision. Any waiver must be in writing and signed by an authorized representative of HireMe.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">Entire Agreement</h2>
              <p className="text-slate-700 leading-relaxed">
                These Terms, together with the Privacy Policy, Cookie Policy, and any additional guidelines or terms notified to you for specific services or features, constitute the entire agreement between you and HireMe regarding the Platform. They supersede all prior or contemporaneous understandings and agreements, whether written or oral, regarding the subject matter. You acknowledge that you have not relied on any representation, warranty, or statement not expressly set out in this Agreement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">Assignment</h2>
              <p className="text-slate-700 leading-relaxed">
                You may not assign or transfer any of your rights or obligations under these Terms without our prior written consent. Any attempt by you to assign in violation of the foregoing is void. HireMe may freely assign or transfer this Agreement (in whole or in part) as part of a merger, acquisition, sale of assets, or by operation of law or otherwise. These Terms shall inure to the benefit of and be binding upon each party's successors and permitted assigns.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">Relationship of Parties</h2>
              <p className="text-slate-700 leading-relaxed">
                You and HireMe are independent contracting parties. This Agreement does not create any partnership, franchise, joint venture, agency, fiduciary, or employment relationship between the parties. You are not an employee of HireMe, and you are not entitled to any compensation or benefits from HireMe as a result of using the Platform (aside from any employment compensation that might be offered by an Employer if you secure employment).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">No Third-Party Beneficiaries</h2>
              <p className="text-slate-700 leading-relaxed">
                Except as expressly provided in these Terms, there are no third-party beneficiaries to this Agreement. These Terms do not confer any rights or remedies on any person other than you and HireMe.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">Changes to Terms</h2>
              <p className="text-slate-700 leading-relaxed">
                We may revise or update these Terms from time to time in our discretion. We will provide notice of material changes (for example, by posting an updated version with a new effective date at the top, or by email notification to the address associated with your Account). Your continued use of the Platform after updated Terms are posted (and have become effective) constitutes your acceptance of the changes. If you do not agree to a change, you must stop using the Platform and may terminate your Account. We encourage you to review the Terms periodically for any updates.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-navy-900 mt-8 mb-4">Contact Us</h2>
              <p className="text-slate-700 leading-relaxed">
                If you have any questions, concerns, or feedback about these Terms or the Platform, please contact us at:{" "}
                <a href="mailto:support@officialhireme.com" className="text-navy-800 hover:text-navy-600 underline font-semibold">
                  support@officialhireme.com
                </a>
              </p>
              <p className="text-slate-700 leading-relaxed mt-4">
                HireMe LLC
              </p>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <Link 
            href={dashboardLink}
            className="inline-flex items-center text-navy-800 hover:text-navy-700 font-semibold transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
