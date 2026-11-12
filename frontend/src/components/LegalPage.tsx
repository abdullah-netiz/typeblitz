import './LegalPage.css';

export type LegalPageType = 'privacy' | 'terms' | 'security' | 'contact';

interface LegalPageProps {
  page: LegalPageType;
  onBack: () => void;
}

const pageDetails: Record<LegalPageType, { title: string; intro: string }> = {
  privacy: {
    title: 'Privacy Policy',
    intro: 'This policy explains what TypeBlitz collects, why it is used, and the choices available to you.'
  },
  terms: {
    title: 'Terms and Conditions',
    intro: 'By using TypeBlitz, you agree to use the service responsibly and to these terms.'
  },
  security: {
    title: 'Security',
    intro: 'TypeBlitz takes reasonable steps to protect accounts and service data, but no online service can guarantee absolute security.'
  },
  contact: {
    title: 'Contact TypeBlitz',
    intro: 'For support, bug reports, privacy requests, or other questions, contact the project through GitHub.'
  }
};

export default function LegalPage({ page, onBack }: LegalPageProps) {
  const details = pageDetails[page];

  return (
    <main className="legal-page fade-in">
      <div className="legal-header">
        <button className="legal-back-btn" onClick={onBack}>
          <span aria-hidden="true">←</span> Back to Test
        </button>
        <p className="legal-updated">Last updated: November 12, 2026</p>
        <h1>{details.title}</h1>
        <p className="legal-intro">{details.intro}</p>
      </div>

      {page === 'privacy' && (
        <div className="legal-content">
          <section>
            <h2>Information we collect</h2>
            <p>
              If you create or use an account, Firebase Authentication may process your email address,
              sign-in provider, display name, profile image, and authentication identifiers. When signed
              in, TypeBlitz stores typing results such as WPM, accuracy, word count, test duration, and
              creation time so your profile and the leaderboard can work.
            </p>
            <p>
              TypeBlitz also stores preferences and personal-best data in your browser, including theme,
              sound settings, onboarding status, and local typing records. These values remain on your
              device unless you clear them.
            </p>
          </section>
          <section>
            <h2>How information is used</h2>
            <p>
              We use information to provide authentication, save and display typing statistics, operate
              the leaderboard, remember preferences, troubleshoot failures, and improve the service.
              We do not sell your personal information.
            </p>
          </section>
          <section>
            <h2>Advertising and third parties</h2>
            <p>
              TypeBlitz uses Google AdSense. Google and its partners may use cookies or similar
              technologies to serve and measure advertising in accordance with their own policies and
              your available choices. Firebase provides authentication services. Requests to these
              providers are governed by their respective privacy policies.
            </p>
          </section>
          <section>
            <h2>Your choices and requests</h2>
            <p>
              You can clear browser storage through your browser settings, sign out of TypeBlitz, or
              request help with account data by contacting the project. Deleting local storage may remove
              locally saved preferences and personal-best records.
            </p>
          </section>
        </div>
      )}

      {page === 'terms' && (
        <div className="legal-content">
          <section>
            <h2>Acceptable use</h2>
            <p>
              Use TypeBlitz lawfully and do not attempt to disrupt the service, bypass authentication,
              scrape private information, submit malicious content, or interfere with other users.
            </p>
          </section>
          <section>
            <h2>Accounts and results</h2>
            <p>
              You are responsible for activity performed through your account and for keeping your
              sign-in credentials secure. Leaderboard results may be removed or limited when they appear
              fraudulent, abusive, or technically invalid.
            </p>
          </section>
          <section>
            <h2>Service availability</h2>
            <p>
              TypeBlitz is provided on an “as available” basis. Features may change, be interrupted, or
              be discontinued without notice. Typing scores are for practice and entertainment and are
              not professional, educational, or employment assessments.
            </p>
          </section>
          <section>
            <h2>Content and responsibility</h2>
            <p>
              TypeBlitz and its original software, design, and branding remain the property of their
              respective owners. You retain responsibility for information you submit. To the extent
              permitted by law, TypeBlitz is not liable for indirect loss arising from use of the service.
            </p>
          </section>
        </div>
      )}

      {page === 'security' && (
        <div className="legal-content">
          <section>
            <h2>Protection measures</h2>
            <p>
              TypeBlitz uses HTTPS when deployed over the production domain, Firebase Authentication for
              sign-in, and authenticated requests for account-specific result operations. Access tokens
              are handled by the authentication provider and are not intentionally displayed in the UI.
            </p>
          </section>
          <section>
            <h2>Limitations</h2>
            <p>
              No website, network, or storage system is completely secure. Do not reuse passwords, and do
              not submit sensitive information into typing tests, profile fields, issue reports, or other
              public areas.
            </p>
          </section>
          <section>
            <h2>Report a security issue</h2>
            <p>
              Please report suspected vulnerabilities privately through the project’s
              <a href="https://github.com/abdullah-netiz/typeblitz/security" target="_blank" rel="noopener noreferrer"> GitHub security page</a>
              rather than posting exploit details publicly.
            </p>
          </section>
        </div>
      )}

      {page === 'contact' && (
        <div className="legal-content">
          <section>
            <h2>Get help</h2>
            <p>
              Open a support request or bug report in the
              <a href="https://github.com/abdullah-netiz/typeblitz/issues" target="_blank" rel="noopener noreferrer"> TypeBlitz GitHub issue tracker</a>.
              Include your browser, device, steps to reproduce the problem, and screenshots when useful.
            </p>
          </section>
          <section>
            <h2>Privacy requests</h2>
            <p>
              For account, privacy, or data questions, open an issue and clearly label it as a private
              request. Do not include passwords, authentication tokens, or other secrets.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
