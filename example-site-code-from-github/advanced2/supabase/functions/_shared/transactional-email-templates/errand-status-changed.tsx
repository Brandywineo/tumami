import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE = "Tumame"
const BRAND = "#0a5c36"

interface Props { name?: string; errandTitle?: string; newStatus?: string }

const statusDisplay: Record<string, string> = {
  paid: "Paid", open: "Open", assigned: "Runner Assigned", in_progress: "In Progress",
  awaiting_confirmation: "Awaiting Your Confirmation", completed: "Completed", cancelled: "Cancelled",
}

const ErrandStatusEmail = ({ name, errandTitle, newStatus }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Errand "{errandTitle}" — {statusDisplay[newStatus || ''] || newStatus}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={{ ...h1, color: BRAND }}>Errand Update</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi,'}</Text>
        <Text style={text}>Your errand <strong>"{errandTitle || 'Errand'}"</strong> has been updated to:</Text>
        <Text style={{ ...text, fontSize: '18px', fontWeight: 'bold' as const, color: BRAND }}>{statusDisplay[newStatus || ''] || newStatus}</Text>
        <Text style={text}>Open the Tumame app to see details.</Text>
        <Text style={footer}>— The {SITE} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ErrandStatusEmail,
  subject: (data: Record<string, any>) => `Errand Update: ${data.errandTitle || 'Errand'} — ${SITE}`,
  displayName: 'Errand status changed',
  previewData: { name: 'Jane', errandTitle: 'Pick up groceries', newStatus: 'in_progress' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: '30px 0 0' }
