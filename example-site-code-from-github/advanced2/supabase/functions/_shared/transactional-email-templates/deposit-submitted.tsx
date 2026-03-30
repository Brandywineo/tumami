import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE = "Tumame"
const BRAND = "#0a5c36"

interface Props { name?: string; amount?: number; mpesaCode?: string }

const DepositSubmittedEmail = ({ name, amount, mpesaCode }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your deposit of KES {amount?.toLocaleString() || '0'} is being verified</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={{ ...h1, color: BRAND }}>Deposit Submitted</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi,'}</Text>
        <Text style={text}>Your manual M-Pesa deposit of <strong>KES {amount?.toLocaleString() || '0'}</strong> has been submitted for verification.</Text>
        {mpesaCode && <Text style={text}>M-Pesa Code: <strong>{mpesaCode}</strong></Text>}
        <Text style={text}>An admin will review and approve your deposit shortly. You'll be notified once it's processed.</Text>
        <Text style={footer}>— The {SITE} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DepositSubmittedEmail,
  subject: `Deposit Submitted for Verification — ${SITE}`,
  displayName: 'Deposit submitted',
  previewData: { name: 'Jane', amount: 1000, mpesaCode: 'SJ12ABC456' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: '30px 0 0' }
