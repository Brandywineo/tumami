import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE = "Tumame"
const BRAND = "#0a5c36"

interface Props { name?: string }

const WelcomeEmail = ({ name }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to Tumame!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={{ ...h1, color: BRAND }}>Welcome to Tumame! 🎉</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi,'}</Text>
        <Text style={text}>Your Tumame account has been created successfully. You can now post errands, top up your wallet, and get things done across Kenya.</Text>
        <Text style={text}>Whether you need deliveries, shopping, or any errand — Tumame runners are ready to help.</Text>
        <Text style={footer}>— The {SITE} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: `Welcome to ${SITE}!`,
  displayName: 'Welcome email',
  previewData: { name: 'Jane' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: '30px 0 0' }
