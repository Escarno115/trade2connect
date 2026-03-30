import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="pb-20 px-4">
      <div className="pt-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg active-scale">
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <h1 className="text-xl font-bold mt-4">Terms & Conditions</h1>
      <p className="text-[10px] text-muted-foreground mt-1">Last updated: March 28, 2026</p>

      <div className="mt-6 space-y-6 text-sm text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
          <p>
            By accessing or using TradeConnect ("the Platform"), you agree to be bound by these Terms & Conditions.
            If you do not agree, do not use the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">2. Platform Role</h2>
          <p>
            TradeConnect acts solely as a marketplace connecting customers with independent service businesses.
            We facilitate bookings, payments tracking, and communication between parties. TradeConnect is <strong className="text-foreground">not</strong> a
            party to any agreement between a customer and a business.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">3. Limitation of Liability</h2>
          <p>
            TradeConnect is not responsible for the quality, safety, legality, or any aspect of the services
            provided by businesses listed on the Platform. Any disputes, damages, injuries, losses, or
            issues arising from interactions between customers and businesses — whether occurring on or
            off the Platform — are strictly between the customer and the business.
          </p>
          <p className="mt-2">
            <strong className="text-foreground">TradeConnect shall not be held liable for any direct, indirect, incidental, consequential,
            or punitive damages</strong> arising from the use of services booked through the Platform, including
            but not limited to property damage, personal injury, financial loss, or dissatisfaction with services rendered.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">4. Business Responsibilities</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Businesses must provide accurate and truthful information during registration.</li>
            <li>Businesses must hold all required licenses, permits, and insurance for their jurisdiction.</li>
            <li>Businesses must maintain accurate hours of operation and office address information.</li>
            <li>Businesses are solely responsible for the quality and delivery of their services.</li>
            <li>Businesses must comply with all applicable local, state, and national laws.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">5. Customer Responsibilities</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Customers must provide accurate booking information and be present at scheduled times.</li>
            <li>Customers should verify business credentials independently before engaging services.</li>
            <li>Customers are responsible for communicating specific requirements to the business.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">6. Subscriptions & Payments</h2>
          <p>
            Businesses may subscribe to paid tiers (Pro or Ultimate) on a weekly or monthly basis.
            Invoices are generated automatically based on the selected billing cycle. Failure to pay
            may result in account suspension or downgrade to the free tier.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">7. Commission</h2>
          <p>
            TradeConnect charges a commission on completed bookings. The rate depends on the business's
            subscription tier: Standard (14%), Pro (7%), Ultimate (1%). Commission is calculated
            automatically upon booking completion.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">8. Dispute Resolution</h2>
          <p>
            Any disputes between customers and businesses must be resolved directly between those
            parties. TradeConnect may, at its sole discretion, assist in mediation but is under no
            obligation to do so. TradeConnect reserves the right to suspend or terminate accounts that
            receive repeated complaints.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">9. Privacy</h2>
          <p>
            We collect and process personal data as necessary to provide the Platform's services.
            Business information including contact details, operating hours, and office address
            is displayed publicly. By registering, you consent to this data being visible to Platform users.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">10. Account Termination</h2>
          <p>
            TradeConnect reserves the right to suspend or terminate any account for violations of these
            Terms, fraudulent activity, or any conduct deemed harmful to the Platform or its users.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">11. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless TradeConnect, its officers, directors, employees,
            and agents from any claims, damages, losses, or expenses arising from your use of the
            Platform or violation of these Terms.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">12. Changes to Terms</h2>
          <p>
            TradeConnect may update these Terms at any time. Continued use of the Platform after changes
            constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section className="bg-secondary rounded-xl p-4">
          <h2 className="text-base font-semibold text-foreground mb-2">⚠️ Important Notice</h2>
          <p className="text-xs">
            By using TradeConnect, you acknowledge and agree that <strong className="text-foreground">any problems, disputes, damages, or issues
            that arise outside the Platform are strictly between the customer and the business</strong>.
            TradeConnect bears no responsibility for off-platform interactions, service quality, or any
            resulting consequences.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsPage;
