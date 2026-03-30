import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE = "Tumame"
const BRAND = "#0a5c36"

interface Props { name?: string; amount?: number }

const DepositApprovedEmail = ({ name, amount }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your deposit of KES {amount?.toLocaleString() || '0'} has been approved</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={{ ...h1, color: BRAND }}>Deposit Approved ✓</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi,'}</Text>
        <Text style={text}>Your manual M-Pesa deposit of <strong>KES {amount?.toLocaleString() || '0'}</strong> has been verified and credited to your wallet.</Text>
        <Text style={text}>You can now use your balance for errands or withdrawals.</Text>
        <Text style={footer}>— The {SITE} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DepositApprovedEmail,
  subject: (data: Record<string, any>) => `Deposit of KES ${data.amount?.toLocaleString() || '0'} Approved — ${SITE}`,
  displayName: 'Deposit approved',
  previewData: { name: 'Jane', amount: 1000 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: '30px 0 0' }
