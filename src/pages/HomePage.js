import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/HomePage.css';

const API_URL = 'https://blog-api-wpbz.onrender.com/api';

const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const [activeTag, setActiveTag] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showNotification } = useNotification();
  const { currentLanguage, languages } = useLanguage();

  const tags = ['All', 'Nature', 'Games', 'Design', 'Programming', 'News', 'Education', 'Creativity', 'Entertainment', 'Technology'];

  // Component mount lifecycle
  useEffect(() => {
    console.log('Component mounted');
    fetchPosts();
    
    // Cleanup function (component unmount)
    return () => {
      console.log('Component unmounting');
      setPosts([]);
      setError(null);
    };
  }, []);

  // Update lifecycle when activeTag changes
  useEffect(() => {
    console.log('Active tag changed to:', activeTag);
    fetchPosts();
  }, [activeTag]);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/posts`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      const data = await response.json();
      
      // Process posts to include author data
      const processedPosts = await Promise.all(data.map(async (post) => {
        if (post.author?.id) {
          try {
            const authorResponse = await fetch(`${API_URL}/users/${post.author.id}`);
            if (authorResponse.ok) {
              const authorData = await authorResponse.json();
              return {
                ...post,
                author: {
                  ...post.author,
                  username: authorData.username,
                  image: authorData.image
                }
              };
            }
          } catch (error) {
            console.error('Error fetching author data:', error);
          }
        }
        return post;
      }));

      setPosts(processedPosts);
      setError(null);
    } catch (error) {
      setError(error.message);
      showNotification('Error loading posts', 'error');
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  const handleTagClick = (tag) => {
    setActiveTag(tag);
    showNotification(`${languages[currentLanguage].showingPostsWithTag}: ${tag}`, 'info');
  };

  const handlePostClick = (postId) => {
    console.log('Post clicked:', postId);
    // You can add additional logic here
  };

  const formatDate = (dateString) => {
    if (!dateString) return languages[currentLanguage].unknown;
    const date = new Date(dateString);
    return date.toLocaleDateString(currentLanguage === 'en' ? 'en-US' : 'et-EE', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const getInitials = (name) => {
    if (!name) return 'UN';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  if (isLoading) {
    return <div className="loading">{languages[currentLanguage].loading}</div>;
  }

  if (error) {
    return <div className="error">{languages[currentLanguage].error}: {error}</div>;
  }

  return (
    <div className="page-content">
      {/* Tags for filtering */}
      <div className="tags-container">
        {tags.map(tag => (
          <div
            key={tag}
            className={`tag ${activeTag === tag ? 'active' : ''}`}
            onClick={() => handleTagClick(tag)}
          >
            {tag}
          </div>
        ))}
      </div>

      {/* Popular posts */}
      <h2 className="section-title">{languages[currentLanguage].popularPosts}</h2>
      <div className="cards-container" id="popular-posts">
        {posts.slice(0, 4).map(post => (
          <Link to={`/post/${post.id}`} key={post.id} className="post-card">
            <div className="card" data-tags={post.tags?.map(tag => tag.name).join(' ')}>
              <div className="card-image">
                {post.mainImage ? (
                  <img src={post.mainImage} alt={post.name || languages[currentLanguage].untitled} />
                ) : (
                  <div style={{ width: '100%', height: '100%', backgroundColor: '#3949ab', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <svg width="50" height="50" viewBox="0 0 24 24" fill="white">
                      <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM8 15c0-1.66 1.34-3 3-3 .35 0 .69.07 1 .18V6h5v2h-3v7.03c-.02 1.64-1.35 2.97-3 2.97-1.66 0-3-1.34-3-3z"/>
                    </svg>
                  </div>
                )}
                <div className="card-content">
                  <div className="card-author">{post.author?.username || languages[currentLanguage].unknown}</div>
                  <h3 className="card-title">{post.name || languages[currentLanguage].untitled}</h3>
                  <p className="card-subtitle">{post.content?.split(' ').slice(0, 5).join(' ') || languages[currentLanguage].noContent}</p>
                  <div className="card-meta">
                    {post.tags?.length > 0 ? (
                      <span className="card-tag">{post.tags[0].name}</span>
                    ) : (
                      <span className="card-tag">{languages[currentLanguage].new}</span>
                    )}
                    <span className="card-time">{languages[currentLanguage].readTime}</span>
                  </div>
                </div>
                <div className="card-actions">
                  <Link to={`/post/${post.id}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent posts */}
      <h2 className="section-title">{languages[currentLanguage].newPosts}</h2>
      <div className="recent-posts" id="recent-posts">
        {posts.map(post => (
          <Link to={`/post/${post.id}`} key={post.id} className="post-item">
            <div className="recent-post" data-tags={post.tags?.map(tag => tag.name).join(' ')}>
              <div className="recent-post-image">
                {post.mainImage ? (
                  <img src={post.mainImage} alt={post.name || languages[currentLanguage].untitled} />
                ) : (
                  <div style={{ width: '100%', height: '100%', backgroundColor: '#3949ab', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <svg width="50" height="50" viewBox="0 0 24 24" fill="white">
                      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                    </svg>
                  </div>
                )}
              </div>
              <div className="recent-post-content">
                <div className="recent-post-author">
                  <div className="author-avatar">
                    {post.author?.image ? (
                      <img src={post.author.image} alt={`${post.author?.username || languages[currentLanguage].unknown}'s avatar`} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', backgroundColor: '#5c6af2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px' }}>
                        {getInitials(post.author?.username)}
                      </div>
                    )}
                  </div>
                  <span className="author-name">{post.author?.username || languages[currentLanguage].unknown}</span>
                </div>
                <h3 className="recent-post-title">
                  <Link to={`/post/${post.id}`}>{post.name || languages[currentLanguage].untitled}</Link>
                </h3>
                <p className="recent-post-excerpt">{post.content?.split(' ').slice(0, 30).join(' ') || languages[currentLanguage].noContent}</p>
                <div className="recent-post-footer">
                  <div className="recent-post-tags">
                    {post.tags?.map(tag => (
                      <div key={tag.id} className="recent-post-tag">{tag.name}</div>
                    ))}
                  </div>
                  <div className="recent-post-meta">
                    <div className="meta-item">
                      <svg className="meta-icon" viewBox="0 0 24 24" fill="#888">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                      <span>{post.views || 0}</span>
                    </div>
                    <div className="meta-item">
                      <svg className="meta-icon" viewBox="0 0 24 24" fill="#888">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                      <span>{post.likes || 0}</span>
                    </div>
                    <div className="meta-item">
                      <svg className="meta-icon" viewBox="0 0 24 24" fill="#888">
                        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                      </svg>
                      <span>{formatDate(post.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default HomePage; 