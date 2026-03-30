import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE = "Tumame"

interface Props { name?: string; amount?: number; reason?: string }

const WithdrawalRejectedEmail = ({ name, amount, reason }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your withdrawal request was not approved</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Withdrawal Not Approved</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi,'}</Text>
        <Text style={text}>Your withdrawal request of <strong>KES {amount?.toLocaleString() || '0'}</strong> was not approved.</Text>
        {reason && <Text style={text}><strong>Reason:</strong> {reason}</Text>}
        <Text style={text}>Your wallet balance remains unchanged. Contact support if you have questions.</Text>
        <Text style={footer}>— The {SITE} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WithdrawalRejectedEmail,
  subject: `Withdrawal Update — ${SITE}`,
  displayName: 'Withdrawal rejected',
  previewData: { name: 'Jane', amount: 2000, reason: 'Insufficient verification' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#c0392b', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: '30px 0 0' }
