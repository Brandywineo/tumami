import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE = "Tumame"

interface Props { name?: string; reason?: string }

const RunnerRejectedEmail = ({ name, reason }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Update on your Tumame runner application</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Application Update</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi,'}</Text>
        <Text style={text}>We've reviewed your runner application and unfortunately we're unable to approve it at this time.</Text>
        {reason && <Text style={text}><strong>Reason:</strong> {reason}</Text>}
        <Text style={text}>You may reapply after addressing the feedback above. Contact support if you have questions.</Text>
        <Text style={footer}>— The {SITE} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RunnerRejectedEmail,
  subject: `Runner Application Update — ${SITE}`,
  displayName: 'Runner rejected',
  previewData: { name: 'James', reason: 'Incomplete ID documents' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#c0392b', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: '30px 0 0' }
