# Security Implementation Guide

## Overview

This document outlines the security measures implemented in TinyTally and provides guidance for production deployment.

## Security Fixes Applied

### 1. Input Sanitization (CRITICAL)

**Problem**: User inputs were not consistently sanitized, creating XSS vulnerabilities.

**Solution**: Implemented comprehensive sanitization in `src/utils/inputValidation.js`:
- Removes HTML tags (`<>`)
- Strips event handlers (`onclick`, `onerror`, etc.)
- Blocks `javascript:` protocol
- Blocks malicious data URIs
- Enforces input length limits

**Applied to**:
- All notes fields (LogFeed, LogDiaper, LogSleep, LogWeight)
- Name fields (ChildProfileSetup, Settings)

### 2. Validation Helpers (HIGH)

**Problem**: Direct use of `parseInt`/`parseFloat` without validation.

**Solution**: Created and applied validation helpers:
- `parsePositiveInt()` - Validates and bounds integers
- `parsePositiveFloat()` - Validates and bounds floats
- Maximum value enforcement via `INPUT_LIMITS`

**Applied to**:
- Feed duration and amount inputs
- Weight inputs

### 3. Date/Time Validation (HIGH)

**Problem**: Forms allowed future dates and invalid time ranges.

**Solution**: Added validation functions:
- `isFutureDate()` - Prevents future timestamps
- `isValidTimeRange()` - Ensures end time > start time
- HTML `max` attributes on datetime inputs

**Applied to**:
- All datetime-local inputs
- Sleep time range validation

### 4. Input Length Limits (MEDIUM)

**Problem**: Missing `maxLength` attributes on text inputs.

**Solution**: Added `maxLength` attributes using `INPUT_LIMITS`:
- Name fields: 100 characters
- Notes fields: 500 characters

**Applied to**:
- All textarea elements
- All text input elements

### 5. Content Security Policy (CRITICAL)

**Current State**: CSP includes `'unsafe-inline'` and `'unsafe-eval'` for Vite development.

**For Production**: Use stricter CSP via HTTP headers (see below).

## Production Deployment

### Recommended CSP for Production

Configure your web server to send the following CSP header instead of the meta tag:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self';
  img-src 'self' data: blob:;
  font-src 'self' data:;
  connect-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
```

### Server Configuration Examples

#### Nginx

```nginx
location / {
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;" always;
}
```

#### Apache (.htaccess)

```apache
<IfModule mod_headers.c>
    Header set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;"
</IfModule>
```

#### Netlify (_headers file)

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;
```

#### Vercel (vercel.json)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;"
        }
      ]
    }
  ]
}
```

## Additional Security Headers

Consider adding these headers in production:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Data Security

### Local Storage
- All data is stored in IndexedDB (unencrypted)
- Data never leaves the device
- No cloud sync or external API calls

### Export Security
- JSON exports contain plaintext data
- Users should secure exported files
- Consider adding password protection for exports (future enhancement)

### Browser Extension Risk
- IndexedDB is accessible to browser extensions
- Users should use trusted extensions only
- Consider encryption at rest (future enhancement)

## Input Validation Constants

Defined in `src/utils/inputValidation.js`:

```javascript
export const INPUT_LIMITS = {
  NAME_MAX_LENGTH: 100,        // Maximum name length
  NOTES_MAX_LENGTH: 500,       // Maximum notes length
  WEIGHT_MAX: 50,              // kg - reasonable max for baby weight
  AMOUNT_MAX: 500,             // ml/oz - reasonable max for bottle
  DURATION_MAX: 180,           // minutes - 3 hours max for feeding
};
```

## Security Testing

### Manual Testing Checklist

- [ ] Test XSS payload in notes fields: `<script>alert('xss')</script>`
- [ ] Test event handlers: `<img src=x onerror=alert(1)>`
- [ ] Test javascript protocol: `javascript:alert(1)`
- [ ] Try entering future dates in all forms
- [ ] Try entering negative numbers in amount/weight fields
- [ ] Try entering values exceeding maximum limits
- [ ] Test end time before start time in sleep logging

### Automated Testing

Consider adding:
- Jest tests for input validation functions
- E2E tests for form submission with malicious payloads
- CSP violation monitoring in production

## Vulnerability Reporting

If you discover a security issue:
1. Do not open a public GitHub issue
2. Email security concerns privately to the maintainer
3. Include reproduction steps and impact assessment

## Security Checklist for Deployment

- [ ] Build production bundle (`npm run build`)
- [ ] Configure strict CSP via HTTP headers
- [ ] Add additional security headers
- [ ] Test on actual hosting environment
- [ ] Verify CSP is active (check browser console)
- [ ] Run npm audit to check for dependency vulnerabilities
- [ ] Enable HTTPS (required for PWA)
- [ ] Test offline functionality
- [ ] Verify service worker security

## Remaining Considerations

### Lower Priority Enhancements

1. **Encryption at rest**: Add optional encryption for IndexedDB
2. **Export encryption**: Password-protect JSON exports
3. **Rate limiting**: Add client-side rate limiting for form submissions
4. **Error tracking**: Implement secure error logging (no PII)
5. **Security monitoring**: Add CSP violation reporting

### Known Limitations

1. **No authentication**: App is single-device, single-user by design
2. **No backup sync**: Users must manually manage exports
3. **Browser storage limits**: IndexedDB has size constraints
4. **No multi-device**: Data not synchronized across devices

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [React Security Best Practices](https://react.dev/learn/security)
- [PWA Security Checklist](https://web.dev/pwa-checklist/)

## Changelog

### 2025-01-14
- Improved input sanitization with comprehensive XSS protection
- Added consistent validation helpers across all components
- Implemented future date prevention on all datetime inputs
- Added time range validation for sleep tracking
- Enforced maxLength on all text inputs
- Enhanced CSP documentation for production
- Created security implementation guide
