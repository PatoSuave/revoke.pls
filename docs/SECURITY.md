# Security

## Security Principles

- Never request private keys or seed phrases
- Only request standard wallet connection
- Only prepare explicit approval revoke transactions
- Show exact spender address before user confirms
- Prefer zeroing allowance over ambiguous flows
- Keep dependencies minimal and audited where possible

## User Warnings
Users should:
- Verify the connected site URL
- Confirm spender address matches intended target
- Review wallet prompts carefully
- Understand that every revoke is an on-chain transaction

## Developer Rules
- No hidden transaction modifications
- No silent wallet requests
- No auto-sign flows
- No proxy write calls without clear disclosure
- No unnecessary backend custody

## Contract Interaction Scope
For MVP, only support:
- ERC-20 `allowance`
- ERC-20 `approve`

## Future Security Enhancements
- spender contract labeling
- verified protocol lists
- suspicious spender warnings
- phishing domain warning banner
