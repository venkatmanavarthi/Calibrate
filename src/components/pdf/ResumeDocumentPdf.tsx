import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Link,
  StyleSheet,
} from '@react-pdf/renderer'
import type { ResumeDocument, ResumeDocumentSection, ResumeDocumentEntry } from '../../types/resume-document'

interface StyleConfig {
  font: string
  fontSize: number
  lineHeight: number
  pageSize: 'LETTER' | 'A4'
  marginPt: number
  paddingTopPt: number
  paddingRightPt: number
  paddingBottomPt: number
  paddingLeftPt: number
}

function makeStyles(cfg: StyleConfig) {
  const { fontSize: fs, lineHeight: lh } = cfg
  return StyleSheet.create({
    page: {
      fontFamily: cfg.font,
      fontSize: fs,
      lineHeight: lh,
      paddingTop: cfg.paddingTopPt,
      paddingRight: cfg.paddingRightPt,
      paddingBottom: cfg.paddingBottomPt,
      paddingLeft: cfg.paddingLeftPt,
      color: '#111111',
    },
    name: {
      fontSize: Math.round(fs * 1.8),
      fontFamily: cfg.font,
      textAlign: 'center',
      marginBottom: 3,
    },
    contactLine: {
      fontSize: Math.round(fs * 0.9),
      textAlign: 'center',
      color: '#444444',
      marginBottom: 3,
    },
    contactSeparator: {
      color: '#888888',
    },
    divider: {
      borderBottomWidth: 0.75,
      borderBottomColor: '#555555',
      marginTop: 4,
      marginBottom: 6,
    },
    sectionContainer: {
      marginTop: 8,
    },
    sectionHeading: {
      fontSize: fs,
      fontFamily: cfg.font,
      marginBottom: 1,
    },
    sectionDivider: {
      borderBottomWidth: 0.5,
      borderBottomColor: '#aaaaaa',
      marginBottom: 4,
    },
    entryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    entryTitle: {
      fontFamily: cfg.font,
      fontSize: fs,
    },
    entryMeta: {
      fontSize: Math.round(fs * 0.9),
      color: '#555555',
    },
    entrySubRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 1,
    },
    entrySubtitle: {
      fontFamily: cfg.font,
      fontSize: fs,
      fontStyle: 'italic',
    },
    entryBody: {
      fontSize: fs,
      lineHeight: lh,
      marginTop: 2,
    },
    bulletRow: {
      flexDirection: 'row',
      marginTop: 1,
      paddingLeft: 8,
    },
    bulletDot: {
      width: 10,
      fontSize: fs,
    },
    bulletText: {
      flex: 1,
      fontSize: fs,
      lineHeight: lh,
    },
    skillsText: {
      fontSize: fs,
      lineHeight: lh,
      marginTop: 2,
    },
    summaryText: {
      fontSize: fs,
      lineHeight: lh,
      marginTop: 4,
    },
  })
}

function contactHref(value: string): string {
  if (value.startsWith('mailto:') || value.includes('@')) {
    return value.startsWith('mailto:') ? value : `mailto:${value}`
  }
  if (value.startsWith('tel:') || /^\+?[\d\s\-().]{7,}$/.test(value)) {
    return value.startsWith('tel:') ? value : `tel:${value.replace(/\s/g, '')}`
  }
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function ContactLine({ contact, styles }: { contact: ResumeDocument['contact']; styles: ReturnType<typeof makeStyles> }) {
  const parts: string[] = []
  if (contact.email) parts.push(contact.email)
  if (contact.phone) parts.push(contact.phone)
  if (contact.location) parts.push(contact.location)
  if (contact.linkedin) parts.push(contact.linkedin)
  if (contact.github) parts.push(contact.github)
  if (contact.website) parts.push(contact.website)

  if (!parts.length) return null

  return (
    <Text style={styles.contactLine}>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          <Link src={contactHref(p)} style={{ color: '#444444', textDecoration: 'none' }}>
            {p}
          </Link>
          {i < parts.length - 1 && <Text style={styles.contactSeparator}>  |  </Text>}
        </React.Fragment>
      ))}
    </Text>
  )
}

function Bullet({ text, styles }: { text: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  )
}

function Entry({ entry, styles }: { entry: ResumeDocumentEntry; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View>
      <View style={styles.entryRow}>
        <Text style={styles.entryTitle}>{entry.left}</Text>
        {entry.right && <Text style={styles.entryMeta}>{entry.right}</Text>}
      </View>
      {(entry.subleft || entry.subright) && (
        <View style={styles.entrySubRow}>
          <Text style={styles.entrySubtitle}>{entry.subleft ?? ''}</Text>
          {entry.subright && <Text style={styles.entryMeta}>{entry.subright}</Text>}
        </View>
      )}
      {entry.body && <Text style={styles.entryBody}>{entry.body}</Text>}
      {entry.bullets?.map((b, i) => <Bullet key={i} text={b} styles={styles} />)}
    </View>
  )
}

function Section({ section, styles }: { section: ResumeDocumentSection; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionHeading}>{section.title.toUpperCase()}</Text>
      {section.layout !== 'summary' && <View style={styles.sectionDivider} />}

      {section.layout === 'summary' && section.text && (
        <Text style={styles.summaryText}>{section.text}</Text>
      )}

      {section.layout === 'skills' && section.skills?.length && (
        <Text style={styles.skillsText}>{section.skills.join('  ·  ')}</Text>
      )}

      {section.layout === 'entries' && section.entries?.map((entry, i) => (
        <Entry key={i} entry={entry} styles={styles} />
      ))}
    </View>
  )
}

export function ResumeDocumentPdf({
  doc,
  cfg,
}: {
  doc: ResumeDocument
  cfg: StyleConfig
}) {
  const styles = makeStyles(cfg)
  return (
    <Document>
      <Page size={cfg.pageSize} style={styles.page}>
        <Text style={styles.name}>{doc.contact.name}</Text>
        <ContactLine contact={doc.contact} styles={styles} />
        <View style={styles.divider} />
        {doc.sections.map((section, i) => (
          <Section key={i} section={section} styles={styles} />
        ))}
      </Page>
    </Document>
  )
}

export type { StyleConfig }
