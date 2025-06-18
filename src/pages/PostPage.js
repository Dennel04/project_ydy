import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import '../styles/PostPage.css';

const API_URL = 'https://blog-api-wpbz.onrender.com/api';

const PostPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const { isAuthenticated, userData, authToken, csrfToken } = useAuth();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchPost();
    }, [id, isAuthenticated, authToken, csrfToken]);

    const fetchPost = async () => {
        try {
            const response = await fetch(`${API_URL}/posts/${id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch post');
            }
            const data = await response.json();
            
            // Fetch author data
            if (data.author?.id) {
                try {
                    const authorResponse = await fetch(`${API_URL}/users/${data.author.id}`);
                    if (authorResponse.ok) {
                        const authorData = await authorResponse.json();
                        data.author = {
                            ...data.author,
                            username: authorData.username,
                            image: authorData.image
                        };
                    }
                } catch (error) {
                    console.error('Error fetching author data:', error);
                }
            }
            
            // Fetch comments separately
            const commentsResponse = await fetch(`${API_URL}/comments/post/${id}`);
            if (!commentsResponse.ok) {
                throw new Error('Failed to fetch comments');
            }
            const commentsData = await commentsResponse.json();
            
            // Check if post is liked
            let isLiked = false;
            if (isAuthenticated) {
                try {
                    const likeResponse = await fetch(`${API_URL}/posts/isliked/${id}`, {
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'X-CSRF-Token': csrfToken
                        },
                        credentials: 'include'
                    });
                    if (likeResponse.ok) {
                        const likeData = await likeResponse.json();
                        console.log('Initial like status:', likeData); // Debug log
                        isLiked = likeData.isLiked;
                    }
                } catch (error) {
                    console.error('Error checking like status:', error);
                }
            }
            
            // Process comments to include author data
            const processedComments = await Promise.all(commentsData.map(async (comment) => {
                if (comment.author?.id) {
                    try {
                        const authorResponse = await fetch(`${API_URL}/users/${comment.author.id}`);
                        if (authorResponse.ok) {
                            const authorData = await authorResponse.json();
                            return {
                                ...comment,
                                author: {
                                    ...comment.author,
                                    username: authorData.username,
                                    image: authorData.image
                                }
                            };
                        }
                    } catch (error) {
                        console.error('Error fetching author data:', error);
                    }
                }
                return comment;
            }));

            console.log('Setting initial post state with isLiked:', isLiked); // Debug log
            setPost({
                ...data,
                comments: processedComments,
                isLiked: isLiked
            });
        } catch (err) {
            setError(err.message);
            showNotification('Error loading post', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async () => {
        if (!isAuthenticated) {
            showNotification('Please log in to like posts', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/posts/like/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken,
                    'Authorization': `Bearer ${authToken}`
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to toggle like');
            }

            const data = await response.json();
            console.log('Like response:', data); // Debug log
            
            // Оптимистичное обновление UI
            setPost(prev => {
                const newIsLiked = data.isLiked !== undefined ? data.isLiked : !prev.isLiked;
                const newLikes = data.likes !== undefined ? data.likes : (newIsLiked ? (prev.likes || 0) + 1 : Math.max(0, (prev.likes || 0) - 1));
                console.log('Updating post state:', { isLiked: newIsLiked, likes: newLikes }); // Debug log
                return {
                    ...prev,
                    likes: newLikes,
                    isLiked: newIsLiked
                };
            });
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };

    const handleDeletePost = async () => {
        if (!window.confirm('Are you sure you want to delete this post?')) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/posts/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken,
                    'Authorization': `Bearer ${authToken}`
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to delete post');
            }

            showNotification('Post deleted successfully', 'success');
            navigate('/');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) {
            showNotification('Comment cannot be empty', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_URL}/comments/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken,
                    'Authorization': `Bearer ${authToken}`
                },
                credentials: 'include',
                body: JSON.stringify({ text: commentText })
            });

            if (!response.ok) {
                throw new Error('Failed to post comment');
            }

            const newComment = await response.json();
            
            // Fetch the author data for the new comment
            let authorData = null;
            if (newComment.author?.id) {
                try {
                    const authorResponse = await fetch(`${API_URL}/users/${newComment.author.id}`);
                    if (authorResponse.ok) {
                        authorData = await authorResponse.json();
                    }
                } catch (error) {
                    console.error('Error fetching author data:', error);
                }
            }

            const commentWithAuthor = {
                ...newComment,
                author: {
                    ...newComment.author,
                    username: authorData?.username || userData.username,
                    image: authorData?.image || userData.image
                }
            };
            
            setPost(prev => ({
                ...prev,
                comments: [commentWithAuthor, ...(prev.comments || [])]
            }));
            setCommentText('');
            showNotification('Comment added successfully', 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCommentLike = async (commentId) => {
        if (!isAuthenticated) {
            showNotification('Please log in to like comments', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/comments/like/${commentId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken,
                    'Authorization': `Bearer ${authToken}`
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to toggle comment like');
            }

            const data = await response.json();
            setPost(prev => ({
                ...prev,
                comments: prev.comments.map(comment =>
                    comment.id === commentId
                        ? { ...comment, likes: data.likes, isLiked: data.isLiked }
                        : comment
                )
            }));
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };

    if (loading) {
        return <div className="loading">Loading post...</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    if (!post) {
        return <div className="error">Post not found</div>;
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
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

    const isAuthor = isAuthenticated && userData && post.author && userData.id === post.author.id;

    return (
        <div className="container">
            <article className="post">
                <header className="post-header">
                    <div className="post-meta">
                        <div className="post-meta-item">
                            <div className="author-info">
                                <div className="author-avatar">
                                    {post.author?.image ? (
                                        <img src={post.author.image} alt={post.author.username} />
                                    ) : (
                                        getInitials(post.author?.username)
                                    )}
                                </div>
                                <span className="author-name">{post.author?.username || 'Unknown'}</span>
                            </div>
                        </div>
                        <div className="meta-right">
                            <span className="publish-date">{formatDate(post.createdAt)}</span>
                            <span className="read-time">5 min read</span>
                            {isAuthor && (
                                <button className="delete-post-btn" onClick={handleDeletePost}>
                                    <i className="material-icons">delete</i>
                                </button>
                            )}
                        </div>
                    </div>

                    <h1>{post.name || 'Untitled'}</h1>

                    <div className="main-image-container">
                        {post.mainImage ? (
                            <img src={post.mainImage} alt={post.name} className="main-image" />
                        ) : (
                            <div className="image-placeholder">
                                No Image Available
                            </div>
                        )}
                    </div>

                    <div className="post-stats">
                        <div className="stat-item like-button" onClick={handleLike}>
                            <i 
                                className="material-icons" 
                                style={{ 
                                    color: post?.isLiked ? '#ef4444' : 'inherit',
                                    transition: 'color 0.2s ease'
                                }}
                            >
                                {post?.isLiked ? 'favorite' : 'favorite_border'}
                            </i>
                            <span>{post?.likes || 0}</span>
                        </div>
                        <div className="stat-item">
                            <i className="material-icons">visibility</i>
                            <span>{post.views || 0}</span>
                        </div>
                        <div className="stat-item">
                            <i className="material-icons">comment</i>
                            <span>{post.comments?.length || 0}</span>
                        </div>
                    </div>
                </header>

                <div className="post-content" dangerouslySetInnerHTML={{ __html: post.content }} />

                {post.images && post.images.length > 0 && (
                    <div className="image-gallery">
                        {post.images.map((image, index) => (
                            <img
                                key={index}
                                src={image}
                                alt={`Gallery image ${index + 1}`}
                                className="gallery-image"
                            />
                        ))}
                    </div>
                )}

                {post.tags && post.tags.length > 0 && (
                    <div className="tags-container">
                        <div className="tags-list">
                            {post.tags.map((tag, index) => (
                                <span key={index} className="tag">{tag.name}</span>
                            ))}
                        </div>
                    </div>
                )}

                <section className="comments-section">
                    <div className="comments-header-container">
                        <h3 className="comments-header">
                            <i className="material-icons">chat_bubble_outline</i>
                            Comments
                            <span className="comments-count">({post.comments?.length || 0})</span>
                        </h3>
                    </div>

                    <div className="comment-form-container">
                        {isAuthenticated ? (
                            <div className="comment-form">
                                <div className="comment-author-info">
                                    <div className="comment-author-avatar">
                                        {userData?.image ? (
                                            <img src={userData.image} alt={userData.username} />
                                        ) : (
                                            getInitials(userData?.username)
                                        )}
                                    </div>
                                    <span className="comment-author-name">{userData?.username}</span>
                                </div>
                                <form onSubmit={handleCommentSubmit}>
                                    <div className="comment-input-container">
                                        <textarea
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            placeholder="Want to comment?"
                                            className="comment-textarea"
                                            rows="3"
                                            required
                                        />
                                        <div className="comment-actions">
                                            <button
                                                type="submit"
                                                className="comment-submit-btn"
                                                disabled={isSubmitting}
                                            >
                                                <i className="material-icons">send</i>
                                                Send
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div className="auth-required-comment">
                                <div className="auth-icon">
                                    <i className="material-icons">login</i>
                                </div>
                                <div className="auth-message">
                                    <h4>Please log in to add a comment</h4>
                                    <p>Join the conversation by sharing your thoughts</p>
                                    <button onClick={() => navigate('/login')} className="login-link">
                                        <i className="material-icons">account_circle</i>
                                        Log In
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="comments-list">
                        {post.comments && post.comments.length > 0 ? (
                            post.comments.map((comment) => (
                                <div key={comment.id} className="comment">
                                    <div className="comment-content">
                                        <div className="comment-header">
                                            <div className="comment-author">
                                                <div className="comment-avatar">
                                                    {comment.author?.image ? (
                                                        <img
                                                            src={comment.author.image}
                                                            alt={comment.author.username}
                                                        />
                                                    ) : (
                                                        getInitials(comment.author?.username)
                                                    )}
                                                </div>
                                                <div className="comment-meta">
                                                    <span className="comment-author-name">
                                                        {comment.author?.username || 'Unknown'}
                                                    </span>
                                                    <span className="comment-date">
                                                        {formatDate(comment.createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="comment-text">
                                            {comment.text || 'Comment not found'}
                                        </div>
                                        <div className="comment-footer">
                                            <button
                                                className={`comment-action-btn like-comment ${comment.isLiked ? 'liked' : ''}`}
                                                onClick={() => handleCommentLike(comment.id)}
                                            >
                                                <i className="material-icons">
                                                    {comment.isLiked ? 'thumb_up' : 'thumb_up'}
                                                </i>
                                                <span>{comment.likes || 0}</span>
                                            </button>
                                            <button className="comment-action-btn reply-comment">
                                                <i className="material-icons">reply</i>
                                                Reply
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-comments">
                                <div className="no-comments-icon">
                                    <i className="material-icons">chat_bubble_outline</i>
                                </div>
                                <h4>No comments yet</h4>
                                <p>Be first!</p>
                            </div>
                        )}
                    </div>
                </section>
            </article>
        </div>
    );
};

export default PostPage; 