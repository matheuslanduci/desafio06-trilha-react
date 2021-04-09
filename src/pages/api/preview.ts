import Prismic from '@prismicio/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { Document } from '@prismicio/client/types/documents';
import { getPrismicClient } from '../../services/prismic';

function linkResolver(doc: Document) {
  if (doc.type === 'posts') {
    return `/post/${doc.uid}`;
  }
  return '/';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const prismic = getPrismicClient(req);
  const { token: ref, documentId } = req.query;

  const redirectUrl = await prismic
    .getPreviewResolver(String(ref), String(documentId))
    .resolve(linkResolver, '/');

  if (!redirectUrl) {
    return res.status(401).json({ message: 'Token inválido.' });
  }

  res.setPreviewData({ ref });
  res.writeHead(302, { location: `${redirectUrl}` });
  res.end();
}
