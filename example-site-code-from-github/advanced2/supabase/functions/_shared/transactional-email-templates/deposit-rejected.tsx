import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE = "Tumame"

interface Props { name?: string; amount?: number; reason?: string }

const DepositRejectedEmail = ({ name, amount, reason }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your deposit of KES {amount?.toLocaleString() || '0'} was not approved</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Deposit Not Approved</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi,'}</Text>
        <Text style={text}>Unfortunately, your manual M-Pesa deposit of <strong>KES {amount?.toLocaleString() || '0'}</strong> could not be verified.</Text>
        {reason && <Text style={text}><strong>Reason:</strong> {reason}</Text>}
        <Text style={text}>If you believe this is an error, please try again or contact support.</Text>
        <Text style={footer}>— The {SITE} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DepositRejectedEmail,
  subject: `Deposit Update — ${SITE}`,
  displayName: 'Deposit rejected',
  previewData: { name: 'Jane', amount: 1000, reason: 'M-Pesa code could not be verified' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#c0392b', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: '30px 0 0' }
