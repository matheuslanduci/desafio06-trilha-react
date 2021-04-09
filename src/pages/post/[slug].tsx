import { GetStaticPaths, GetStaticProps } from 'next';
import { Fragment } from 'react';
import Head from 'next/head';
import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';

import { getPrismicClient } from '../../services/prismic';

import Header from '../../components/Header';
import Comments from '../../components/Comments';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  previousPost: {
    slug: string;
    title: string;
  };
  nextPost: {
    slug: string;
    title: string;
  };
  preview: boolean;
}

export default function Post({
  post,
  preview,
  nextPost,
  previousPost,
}: PostProps) {
  const { isFallback } = useRouter();

  if (isFallback) {
    return <span>Carregando...</span>;
  }

  const minutesToRead = post.data.content.reduce((acc, content) => {
    function countWords(str: string) {
      return str.trim().split(/\s+/).length;
    }

    acc += countWords(content.heading) / 200;
    acc += countWords(RichText.asText(content.body)) / 200;

    return Math.ceil(acc);
  }, 0);

  return (
    <>
      <Head>
        <title>spacetraveling - {post.data.title}</title>
      </Head>
      <Header />
      <main className={styles.container}>
        <img src={post.data.banner.url} alt={post.data.title} />
        <article className={commonStyles.container}>
          <h1>{post.data.title}</h1>
          <div className={styles.data}>
            <time>
              <FiCalendar size={24} />
              {format(new Date(post.first_publication_date), 'dd MMM u', {
                locale: ptBR,
              })}
            </time>
            <div className={styles.author}>
              <FiUser size={24} />
              {post.data.author}
            </div>
            <div className={styles.readTime}>
              <FiClock size={24} />
              {minutesToRead} min
            </div>
          </div>
          <i className={styles.updatedTime}>
            {format(
              new Date(post.last_publication_date),
              "'* editado em' dd MMM u', às' kk':'mm ",
              {
                locale: ptBR,
              }
            )}
          </i>
          <div className={styles.content}>
            {post.data.content.map((content, index) => (
              <Fragment key={index}>
                <h2>{content.heading}</h2>
                <div
                  key={index}
                  dangerouslySetInnerHTML={{
                    __html: RichText.asHtml(content.body),
                  }}
                ></div>
              </Fragment>
            ))}
          </div>
          <hr />
          <div className={styles.navPosts}>
            {previousPost ? (
              <Link href={`/post/${previousPost.slug}`}>
                <a className={styles.previousPost}>
                  <span className={styles.title}>{previousPost.title}</span>
                  <strong>Post anterior</strong>
                </a>
              </Link>
            ) : (
              <div className={styles.previousPost} />
            )}
            {nextPost && (
              <Link href={`/post/${nextPost.slug}`}>
                <a className={styles.nextPost}>
                  <span className={styles.title}>{nextPost.title}</span>
                  <strong>Próximo post</strong>
                </a>
              </Link>
            )}
          </div>
        </article>
        <Comments />
        {preview && (
          <aside className={commonStyles.preview}>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.banner', 'posts.author', 'posts.content'],
    }
  );

  const paths = posts.results.map(result => ({
    params: {
      slug: result.uid,
    },
  }));

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps<PostProps> = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const previousPostResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title'],
      pageSize: 1,
      after: `${response.id}`,
      orderings: '[document.first_publication_date desc]',
      ref: previewData?.ref ?? null,
    }
  );

  const nextPostResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title'],
      pageSize: 1,
      after: `${response.id}`,
      orderings: '[document.first_publication_date]',
      ref: previewData?.ref ?? null,
    }
  );

  const previousPost =
    previousPostResponse.results.length > 0
      ? {
          slug: previousPostResponse.results[0].uid,
          title: previousPostResponse.results[0].data.title,
        }
      : null;

  const nextPost =
    nextPostResponse.results.length > 0
      ? {
          slug: nextPostResponse.results[0].uid,
          title: nextPostResponse.results[0].data.title,
        }
      : null;

  const post = {
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content,
      subtitle: response.data.subtitle,
    },
    uid: response.uid,
  };

  const timeToRevalidate = 60;

  return {
    props: {
      post,
      preview,
      previousPost,
      nextPost,
    },
    revalidate: timeToRevalidate,
  };
};
