import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE = "Tumame"
const BRAND = "#0a5c36"

interface Props { name?: string }

const RunnerApprovedEmail = ({ name }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been approved as a Tumame runner!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={{ ...h1, color: BRAND }}>You're Approved! 🎉</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi,'}</Text>
        <Text style={text}>Great news! Your runner application has been <strong>approved</strong>. You can now start accepting and completing errands on Tumame.</Text>
        <Text style={text}>Log in to your dashboard to see available errands in your area.</Text>
        <Text style={footer}>— The {SITE} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RunnerApprovedEmail,
  subject: `Runner Application Approved — ${SITE}`,
  displayName: 'Runner approved',
  previewData: { name: 'James' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: '30px 0 0' }
