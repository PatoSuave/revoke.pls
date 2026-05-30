"use client";

import { FormEvent, useMemo, useState } from "react";

import { LinkCheckerResult } from "@/components/security/link-checker-result";
import { CANDIDATE_DOMAIN_HOSTNAMES } from "@/lib/security/candidate-domain-registry";
import { checkCryptoLink } from "@/lib/security/link-checker";

const EXAMPLE_LINK = "https://pulserevoke.com/security";
const CANDIDATE_EXAMPLE_LINK = "https://app.pulsex.com";

export function LinkChecker() {
  const [input, setInput] = useState("");
  const [submittedInput, setSubmittedInput] = useState("");

  const result = useMemo(() => {
    if (!submittedInput) return null;
    return checkCryptoLink(submittedInput);
  }, [submittedInput]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedInput(input);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
      <section className="rounded-2xl border border-pulse-border bg-pulse-panel/70 p-5 sm:p-6">
        <form onSubmit={handleSubmit}>
          <label
            htmlFor="crypto-link"
            className="text-sm font-semibold text-pulse-text"
          >
            Paste a URL or domain
          </label>
          <input
            id="crypto-link"
            name="crypto-link"
            type="text"
            inputMode="url"
            autoComplete="off"
            placeholder="pulserevoke.com"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="mt-3 w-full rounded-xl border border-pulse-border bg-pulse-bg px-4 py-3 font-mono text-sm text-pulse-text outline-none transition placeholder:text-pulse-muted/70 focus:border-pulse-cyan focus:ring-2 focus:ring-pulse-cyan/25"
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-pulse-gradient px-5 py-3 text-sm font-semibold text-pulse-on-gradient shadow-glow transition hover:brightness-110"
            >
              Check Link
            </button>
            <button
              type="button"
              onClick={() => {
                setInput(EXAMPLE_LINK);
                setSubmittedInput(EXAMPLE_LINK);
              }}
              className="inline-flex items-center justify-center rounded-xl border border-pulse-border bg-pulse-text/5 px-5 py-3 text-sm font-semibold text-pulse-text transition hover:bg-pulse-text/10"
            >
              Try official example
            </button>
            <button
              type="button"
              onClick={() => {
                setInput(CANDIDATE_EXAMPLE_LINK);
                setSubmittedInput(CANDIDATE_EXAMPLE_LINK);
              }}
              className="inline-flex items-center justify-center rounded-xl border border-pulse-cyan/35 bg-pulse-cyan/10 px-5 py-3 text-sm font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15"
            >
              Try source-list example
            </button>
          </div>
        </form>

        <div className="mt-6 rounded-2xl border border-pulse-border bg-pulse-bg/45 p-4 text-sm leading-7 text-pulse-muted">
          <h2 className="font-semibold text-pulse-text">
            What this checker can and cannot do.
          </h2>
          <p className="mt-2">
            It checks the text you paste for local URL patterns, registry
            matches, and common phishing clues. It does not open the link, fetch
            the site, crawl pages, resolve DNS, request screenshots, connect a
            wallet, or submit transactions.
          </p>
          <p className="mt-2">
            Candidate source context currently covers{" "}
            <span className="font-mono text-pulse-text">
              {CANDIDATE_DOMAIN_HOSTNAMES.length}
            </span>{" "}
            hostnames from reviewed source packets. Those entries are not
            official-domain matches.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-red-400/35 bg-red-500/10 p-4 text-sm leading-7 text-red-100">
          <h2 className="font-semibold text-red-50">
            Never enter your seed phrase.
          </h2>
          <p className="mt-2">
            Pulse Revoke will never ask for your seed phrase or private key. A
            clean-looking result does not prove a site is legitimate, and
            unknown does not mean malicious.
          </p>
        </div>
      </section>

      {result ? (
        <LinkCheckerResult result={result} />
      ) : (
        <section className="rounded-2xl border border-pulse-border bg-pulse-panel/70 p-5 text-sm leading-7 text-pulse-muted sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            Waiting for input
          </p>
          <h2 className="mt-2 text-2xl font-bold text-pulse-text">
            Check before you connect.
          </h2>
          <p className="mt-4">
            Paste a link from a DM, ad, search result, or chat message to review
            basic static signals before visiting it or connecting a wallet.
          </p>
        </section>
      )}
    </div>
  );
}
