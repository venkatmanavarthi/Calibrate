import React from 'react'
import { Document, Page, Text, View } from '@react-pdf/renderer'

interface Props {
  text: string
  pageSize: 'LETTER' | 'A4' | 'TABLOID'
}

export function PlainMarkdownPdf({ text, pageSize }: Props) {
  return (
    <Document>
      <Page size={pageSize} style={{ padding: 40, fontSize: 10, fontFamily: 'Helvetica' }}>
        <View>
          <Text>{text}</Text>
        </View>
      </Page>
    </Document>
  )
}
