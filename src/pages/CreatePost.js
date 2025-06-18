import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/CreatePost.css';

const CreatePost = () => {
    const navigate = useNavigate();
    const { isAuthenticated, authToken, csrfToken, isLoading } = useAuth();
    const { currentLanguage, languages } = useLanguage();
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        main_image: null,
        contentImages: [],
        tags: []
    });
    const [availableTags, setAvailableTags] = useState([]);
    const [error, setError] = useState('');
    const [mainImageName, setMainImageName] = useState(languages[currentLanguage].noImageSelected);
    const [additionalImagesNames, setAdditionalImagesNames] = useState(languages[currentLanguage].noAdditionalImagesSelected);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate('/login');
            return;
        }

        if (!isLoading && isAuthenticated) {
            const fetchTags = async () => {
                try {
                    const response = await fetch('https://blog-api-wpbz.onrender.com/api/tags', {
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'X-CSRF-Token': csrfToken
                        },
                        credentials: 'include'
                    });
                    if (!response.ok) {
                        throw new Error(languages[currentLanguage].failedToFetchTags);
                    }
                    const tags = await response.json();
                    setAvailableTags(tags);
                } catch (err) {
                    console.error('Error fetching tags:', err);
                    setError(languages[currentLanguage].failedToLoadTags);
                }
            };

            fetchTags();
        }
    }, [isAuthenticated, navigate, authToken, csrfToken, isLoading, currentLanguage, languages]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleMainImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                main_image: file
            }));
            setMainImageName(file.name);
        } else {
            setMainImageName(languages[currentLanguage].noImageSelected);
        }
    };

    const handleAdditionalImagesChange = (e) => {
        const files = Array.from(e.target.files);
        setFormData(prev => ({
            ...prev,
            contentImages: files
        }));
        setAdditionalImagesNames(files.length > 0 
            ? files.map(file => file.name).join(', ')
            : languages[currentLanguage].noAdditionalImagesSelected
        );
    };

    const handleTagClick = (tagName) => {
        setFormData(prev => {
            const currentTags = [...prev.tags];
            const index = currentTags.indexOf(tagName);
            
            if (index === -1) {
                if (currentTags.length < 3) {
                    currentTags.push(tagName);
                } else {
                    setError(languages[currentLanguage].maxTagsError);
                    return prev;
                }
            } else {
                currentTags.splice(index, 1);
            }
            
            return { ...prev, tags: currentTags };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.title || !formData.content) {
            setError(languages[currentLanguage].titleAndContentRequired);
            return;
        }

        try {
            const tagResponse = await fetch('https://blog-api-wpbz.onrender.com/api/tags', {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'X-CSRF-Token': csrfToken
                },
                credentials: 'include'
            });

            if (!tagResponse.ok) {
                throw new Error(languages[currentLanguage].failedToFetchTags);
            }

            const availableTags = await tagResponse.json();
            const tagIds = formData.tags.map(tagName => {
                const tag = availableTags.find(t => t.name === tagName);
                return tag ? tag.id : null;
            }).filter(id => id !== null);

            const missingTags = formData.tags.filter(tagName => 
                !availableTags.some(t => t.name === tagName)
            );

            const formDataToSend = new FormData();
            formDataToSend.append('name', formData.title);
            formDataToSend.append('content', formData.content);
            formDataToSend.append('isPublished', 'true');
            formDataToSend.append('tags', JSON.stringify(tagIds));

            if (formData.main_image) {
                formDataToSend.append('mainImage', formData.main_image);
            }

            formData.contentImages.forEach(image => {
                formDataToSend.append('contentImages', image);
            });

            const response = await fetch('https://blog-api-wpbz.onrender.com/api/posts', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'X-CSRF-Token': csrfToken
                },
                credentials: 'include',
                body: formDataToSend
            });

            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                throw new Error(languages[currentLanguage].serverError + ': ' + text);
            }

            if (!response.ok) {
                throw new Error(data.message || languages[currentLanguage].failedToCreatePost);
            }
            
            if (missingTags.length > 0) {
                setError(languages[currentLanguage].postCreatedWithMissingTags.replace('{tags}', missingTags.join(', ')));
            } else {
                navigate(`/post/${data._id || data.id}`);
            }
        } catch (err) {
            console.error('Error creating post:', err);
            setError(err.message || languages[currentLanguage].createPostError);
        }
    };

    return (
        <div className="create-post-container">
            <div className="create-post-header">
                <h1>{languages[currentLanguage].createNewPost}</h1>
                <p className="post-subtitle">{languages[currentLanguage].shareIdeas}</p>
            </div>
            
            <div className="create-post-form">
                {error && <p className="error">{error}</p>}
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="title">{languages[currentLanguage].title}</label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            className="form-input"
                            placeholder={languages[currentLanguage].enterTitle}
                            value={formData.title}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="content">{languages[currentLanguage].content}</label>
                        <textarea
                            id="content"
                            name="content"
                            className="form-textarea"
                            placeholder={languages[currentLanguage].enterContent}
                            value={formData.content}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>{languages[currentLanguage].mainImage}</label>
                        <div className="file-input-container">
                            <input
                                type="file"
                                id="main_image"
                                accept="image/*"
                                onChange={handleMainImageChange}
                                className="file-input"
                            />
                            <label htmlFor="main_image" className="file-input-label">
                                {languages[currentLanguage].chooseImage}
                            </label>
                            <span className="file-name">{mainImageName}</span>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>{languages[currentLanguage].additionalImages}</label>
                        <div className="file-input-container">
                            <input
                                type="file"
                                id="content_images"
                                accept="image/*"
                                multiple
                                onChange={handleAdditionalImagesChange}
                                className="file-input"
                            />
                            <label htmlFor="content_images" className="file-input-label">
                                {languages[currentLanguage].chooseImages}
                            </label>
                            <span className="file-name">{additionalImagesNames}</span>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>{languages[currentLanguage].tags}</label>
                        <div className="tags-container">
                            {availableTags.map(tag => (
                                <button
                                    key={tag.id}
                                    type="button"
                                    className={`tag ${formData.tags.includes(tag.name) ? 'selected' : ''}`}
                                    onClick={() => handleTagClick(tag.name)}
                                >
                                    {tag.name}
                                </button>
                            ))}
                        </div>
                        <p className="tags-hint">{languages[currentLanguage].maxTagsHint}</p>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="submit-button">
                            {languages[currentLanguage].publish}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreatePost; 