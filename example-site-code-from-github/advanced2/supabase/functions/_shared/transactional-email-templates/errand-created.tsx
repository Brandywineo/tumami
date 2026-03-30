import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE = "Tumame"
const BRAND = "#0a5c36"

interface Props { name?: string; errandTitle?: string; amount?: number }

const ErrandCreatedEmail = ({ name, errandTitle, amount }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your errand "{errandTitle || 'New Errand'}" has been created</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={{ ...h1, color: BRAND }}>Errand Created</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi,'}</Text>
        <Text style={text}>Your errand <strong>"{errandTitle || 'New Errand'}"</strong> has been created successfully.</Text>
        {amount && <Text style={text}>Total: <strong>KES {amount.toLocaleString()}</strong></Text>}
        <Text style={text}>Complete the payment to make it available for runners.</Text>
        <Text style={footer}>— The {SITE} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ErrandCreatedEmail,
  subject: (data: Record<string, any>) => `Errand Created: ${data.errandTitle || 'New Errand'} — ${SITE}`,
  displayName: 'Errand created',
  previewData: { name: 'Jane', errandTitle: 'Pick up groceries', amount: 500 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: '30px 0 0' }
