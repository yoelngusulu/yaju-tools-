"use client";

import { useMemo, useState } from "react";

import { maskPhoneNumber } from "@/lib/billing/format";

type SubmittedPayment = {
  id: string;
  status: string;
  amountTzs: number;
  expectedAmountTzs: number;
  phoneNumberMasked: string;
  expiresAt: string;
};

type PremiumPaymentFormProps = {
  planName: string;
  formattedPrice: string;
  amountTzs: number;
  billingPeriod: string;
  airtelLipaNamba: string;
  accountReference: string;
  checkoutConfigured: boolean;
};

type InstructionLanguage = "en" | "sw";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function PremiumPaymentForm({
  planName,
  formattedPrice,
  amountTzs,
  billingPeriod,
  airtelLipaNamba,
  checkoutConfigured,
}: PremiumPaymentFormProps) {
  const [transactionReference, setTransactionReference] =
    useState("");
  const [amountPaid, setAmountPaid] = useState(
    String(amountTzs || "")
  );
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [submittedPayment, setSubmittedPayment] =
    useState<SubmittedPayment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [instructionLanguage, setInstructionLanguage] =
    useState<InstructionLanguage>("en");

  const maskedPhoneNumber = useMemo(
    () => maskPhoneNumber(phoneNumber),
    [phoneNumber]
  );

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setSubmittedPayment(null);

    if (!checkoutConfigured) {
      setError(
        "Premium checkout is not configured yet. Please contact YAJU support."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        "/api/billing/premium/payment-requests",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transactionReference,
            amountPaid,
            phoneNumber,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to submit payment for verification."
        );
      }

      setSubmittedPayment(data.payment as SubmittedPayment);
      setTransactionReference("");
      setPhoneNumber("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit payment for verification."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
          Secure Manual Checkout
        </p>

        <h1 className="mt-3 text-3xl font-bold text-gray-900">
          {planName}
        </h1>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Price</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formattedPrice}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-sm text-gray-500">
              Billing period
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {billingPeriod}
            </p>
          </div>
        </div>

        {!checkoutConfigured ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            Premium checkout is not configured yet. Set the server
            environment variables before accepting real payments.
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-bold text-gray-900">
                {instructionLanguage === "en"
                  ? "Airtel Money Payment Instructions"
                  : "Maelekezo ya Malipo kwa Airtel Money"}
              </h2>

              <div className="inline-flex rounded-lg border border-blue-200 bg-white p-1 text-xs font-semibold text-gray-700">
                <button
                  type="button"
                  onClick={() => setInstructionLanguage("en")}
                  className={`rounded-md px-3 py-1.5 transition ${
                    instructionLanguage === "en"
                      ? "bg-blue-600 text-white"
                      : "hover:bg-blue-50"
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setInstructionLanguage("sw")}
                  className={`rounded-md px-3 py-1.5 transition ${
                    instructionLanguage === "sw"
                      ? "bg-blue-600 text-white"
                      : "hover:bg-blue-50"
                  }`}
                >
                  Kiswahili
                </button>
              </div>
            </div>

            {instructionLanguage === "en" ? (
              <ol className="mt-4 space-y-3 text-sm leading-6 text-gray-700">
                <li>
                  1. Dial <strong>*150*60#</strong> on your Airtel line.
                </li>
                <li>
                  2. Select <strong>5 - Lipa Bili</strong>.
                </li>
                <li>
                  3. Select <strong>1 - Lipa kwa Simu</strong>.
                </li>
                <li>
                  4. Select <strong>1 - Weka Lipa Namba</strong>.
                </li>
                <li>
                  5. Enter the <strong>YAJU Airtel Lipa Namba</strong> displayed below.
                </li>
                <li>
                  6. Enter the required payment amount shown on the checkout page.
                </li>
                <li>
                  7. Enter your <strong>Airtel Money PIN</strong> on your phone to confirm the payment.
                </li>
                <li>
                  8. After payment is completed, copy the <strong>Airtel Money Transaction ID</strong> from the confirmation SMS.
                </li>
                <li>
                  9. Enter the Transaction ID, amount paid and phone number in the YAJU payment form.
                </li>
                <li>
                  10. Click <strong>Submit Payment for Verification</strong>.
                </li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-3 text-sm leading-6 text-gray-700">
                <li>
                  1. Piga <strong>*150*60#</strong> kwenye laini yako ya Airtel.
                </li>
                <li>
                  2. Chagua <strong>5 - Lipa Bili</strong>.
                </li>
                <li>
                  3. Chagua <strong>1 - Lipa kwa Simu</strong>.
                </li>
                <li>
                  4. Chagua <strong>1 - Weka Lipa Namba</strong>.
                </li>
                <li>
                  5. Weka <strong>YAJU Airtel Lipa Namba</strong> inayoonekana hapa chini.
                </li>
                <li>
                  6. Weka kiasi cha malipo kinachoonyeshwa kwenye ukurasa wa checkout.
                </li>
                <li>
                  7. Weka <strong>Airtel Money PIN</strong> kwenye simu yako kuthibitisha malipo.
                </li>
                <li>
                  8. Baada ya malipo kukamilika, nakili <strong>Airtel Money Transaction ID</strong> kutoka kwenye SMS ya uthibitisho.
                </li>
                <li>
                  9. Weka Transaction ID, kiasi ulicholipa na namba ya simu kwenye fomu ya malipo ya YAJU.
                </li>
                <li>
                  10. Bonyeza <strong>Submit Payment for Verification</strong>.
                </li>
              </ol>
            )}

            <p className="mt-4 rounded-lg border border-blue-200 bg-white px-4 py-3 text-sm leading-6 text-gray-700">
              {instructionLanguage === "en" ? (
                <>
                  <strong className="text-gray-900">Important:</strong>{" "}
                  Never enter your Airtel Money PIN on YAJU. Your
                  PIN should only be entered through the Airtel Money
                  menu on your phone.
                </>
              ) : (
                <>
                  <strong className="text-gray-900">Muhimu:</strong>{" "}
                  Usiweke Airtel Money PIN yako kwenye YAJU. PIN
                  yako inapaswa kuwekwa tu kupitia menu ya Airtel Money
                  kwenye simu yako.
                </>
              )}
            </p>

            <div className="mt-5 rounded-xl bg-white p-4">
              <p className="text-sm text-gray-500">
                Airtel Lipa Namba
              </p>
              <p className="mt-1 text-3xl font-bold tracking-wide text-gray-900">
                {airtelLipaNamba}
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">
          Submit payment details
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Premium will activate only after an authorized admin verifies
          your Airtel payment. Submitting a transaction ID does not
          confirm payment automatically.
        </p>

        {submittedPayment && (
          <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800">
            <p className="font-bold">
              Payment submitted for verification
            </p>
            <p className="mt-1">
              Status: {submittedPayment.status}. We will activate
              Premium after verification.
            </p>
            <p className="mt-1">
              Phone: {submittedPayment.phoneNumberMasked}
            </p>
            <p className="mt-1">
              Request expires: {formatDate(submittedPayment.expiresAt)}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="transaction-reference"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Airtel transaction ID
            </label>
            <input
              id="transaction-reference"
              value={transactionReference}
              onChange={(event) =>
                setTransactionReference(event.target.value)
              }
              placeholder="Example: PP2408ABC123"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="amount-paid"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Amount paid (TZS)
            </label>
            <input
              id="amount-paid"
              inputMode="numeric"
              value={amountPaid}
              onChange={(event) =>
                setAmountPaid(event.target.value)
              }
              placeholder={String(amountTzs || "")}
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="phone-number"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Phone number used for payment
            </label>
            <input
              id="phone-number"
              type="tel"
              value={phoneNumber}
              onChange={(event) =>
                setPhoneNumber(event.target.value)
              }
              placeholder="Example: 2557XXXXXXX"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            {maskedPhoneNumber && (
              <p className="mt-2 text-xs text-gray-500">
                Displayed as {maskedPhoneNumber}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !checkoutConfigured}
            className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "Submitting for verification..."
              : "Submit Payment for Verification"}
          </button>
        </form>
      </section>
    </div>
  );
}
