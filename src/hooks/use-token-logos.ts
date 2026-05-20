"use client";

import { useEffect, useMemo, useState } from "react";

import {
  isTokenLogoSupportedChain,
  normalizeLogoAddresses,
  tokenLogoAddressKey,
  type TokenLogoMap,
} from "@/lib/token-logos";

type TokenLogoHookState = {
  status: "idle" | "loading" | "success" | "error";
  logos: TokenLogoMap;
  error: string | null;
};

const EMPTY_LOGO_STATE: TokenLogoHookState = {
  status: "idle",
  logos: {},
  error: null,
};

export function useTokenLogos({
  chainId,
  tokenAddresses,
}: {
  chainId: number | undefined;
  tokenAddresses: readonly string[];
}): TokenLogoHookState {
  const normalizedAddresses = useMemo(
    () => normalizeLogoAddresses(tokenAddresses),
    [tokenAddresses],
  );
  const addressKey = useMemo(
    () => normalizedAddresses.map(tokenLogoAddressKey).join(","),
    [normalizedAddresses],
  );
  const [state, setState] = useState<TokenLogoHookState>(EMPTY_LOGO_STATE);

  useEffect(() => {
    if (
      !chainId ||
      !isTokenLogoSupportedChain(chainId) ||
      normalizedAddresses.length === 0
    ) {
      setState(EMPTY_LOGO_STATE);
      return;
    }

    const controller = new AbortController();
    setState((previous) => ({
      status: "loading",
      logos: previous.logos,
      error: null,
    }));

    const params = new URLSearchParams({
      chainId: chainId.toString(),
      addresses: normalizedAddresses.join(","),
    });

    fetch(`/api/token-logos?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || body?.ok === false) {
          throw new Error(
            Array.isArray(body?.errors)
              ? body.errors.join(" ")
              : "Token logo lookup failed.",
          );
        }
        return body as { logos?: TokenLogoMap };
      })
      .then((body) => {
        if (controller.signal.aborted) return;

        setState({
          status: "success",
          logos: body.logos ?? {},
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        setState({
          status: "error",
          logos: {},
          error:
            error instanceof Error
              ? error.message
              : "Token logo lookup failed.",
        });
      });

    return () => controller.abort();
  }, [addressKey, chainId, normalizedAddresses]);

  return state;
}
