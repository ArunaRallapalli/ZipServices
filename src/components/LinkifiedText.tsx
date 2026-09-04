/**
 * LinkifiedText.tsx
 *
 * [2026-08-30] [feature/link-in-description] Created — provider descriptions
 * (ServiceCard, RecentPostsSection, SearchResultsList) were rendering URLs as
 * plain inert text (e.g. "www.kiranabandi.com"), so a link a provider typed
 * into their description couldn't be tapped. This component splits text on
 * URLs and renders each match as a tappable link via Linking.openURL, while
 * everything else renders exactly as before.
 */

import React from "react";
import { Text, Linking, TextStyle, StyleProp } from "react-native";

// Matches http(s):// URLs and bare "www." domains. Trailing punctuation
// (.,;:!?) commonly typed at the end of a sentence is trimmed off the link
// and rendered back as plain text so the opened URL isn't broken.
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
const TRAILING_PUNCTUATION_REGEX = /[.,;:!?)\]}]+$/;

interface LinkifiedTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export default function LinkifiedText({ text, style, linkStyle, numberOfLines }: LinkifiedTextProps) {
  // String.split() with a capturing-group regex returns matches interleaved
  // with the surrounding text, always alternating: even indices are plain
  // text (possibly ""), odd indices are the URL matches.
  const parts = text.split(URL_REGEX);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, index) => {
        if (index % 2 === 0) {
          return part || null;
        }

        const trailingMatch = part.match(TRAILING_PUNCTUATION_REGEX);
        const trailing = trailingMatch ? trailingMatch[0] : "";
        const url = trailing ? part.slice(0, -trailing.length) : part;
        const href = url.toLowerCase().startsWith("www.") ? `https://${url}` : url;

        return (
          <Text key={index}>
            <Text
              style={[{ color: "#1a73e8", textDecorationLine: "underline" }, linkStyle]}
              onPress={() => Linking.openURL(href).catch(() => {})}
            >
              {url}
            </Text>
            {trailing}
          </Text>
        );
      })}
    </Text>
  );
}
