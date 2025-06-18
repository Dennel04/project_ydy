import React, { createContext, useState, useContext } from 'react';

const LanguageContext = createContext();

export const languages = {
  en: {
    // Navigation
    home: 'Home',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Logout',
    language: 'Language',
    english: 'English',
    estonian: 'Estonian',
    security: 'Security',
    myPosts: 'My Posts',
    
    // Profile
    name: 'Name',
    username: 'Username',
    bio: 'Bio',
    saveChanges: 'Save Changes',
    cancel: 'Cancel',
    edit: 'Edit',
    noBio: 'No bio yet',
    characters: 'Characters',
    
    // Profile descriptions
    nameDescription: 'Your name appears on your Profile page, as your byline, and in your responses.',
    usernameDescription: 'Your @username for identifying your profile (cannot be changed)',
    bioDescription: 'Tell us about yourself',
    
    // Security
    password: 'Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    changePassword: 'Change Password',
    
    // Auth
    login: 'Login',
    register: 'Register',
    email: 'Email',
    forgotPassword: 'Forgot Password?',
    rememberMe: 'Remember Me',
    createAccount: 'Create Account',
    alreadyHaveAccount: 'Already have an account?',
    dontHaveAccount: "Don't have an account?",
    
    // Posts
    createPost: 'Create Post',
    editPost: 'Edit Post',
    deletePost: 'Delete Post',
    postTitle: 'Post Title',
    postContent: 'Post Content',
    publish: 'Publish',
    comments: 'Comments',
    writeComment: 'Write a comment...',
    submit: 'Submit',
    
    // Common
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Information',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    date: 'Date',
    author: 'Author',
    category: 'Category',
    tags: 'Tags',
    
    // Header
    toggleTheme: 'Toggle theme',
    searchPlaceholder: 'Search ideas',
    userAvatar: 'User Avatar',
    signIn: 'Sign in',
    
    // Home page
    whatsHappening: "What's happening?",
    post: 'Post',
    trending: 'Trending',
    whoToFollow: 'Who to follow',
    showMore: 'Show more',
    showLess: 'Show less',
    
    // Post actions
    like: 'Like',
    comment: 'Comment',
    share: 'Share',
    save: 'Save',
    report: 'Report',
    
    // Home page specific
    popularPosts: 'Popular posts',
    newPosts: 'New posts',
    showingPostsWithTag: 'Showing posts with tag',
    readTime: '5 MIN READ',
    untitled: 'Untitled',
    noContent: 'No content',
    unknown: 'Unknown',
    new: 'NEW',
    
    // Create Post
    createNewPost: 'Create New Post',
    shareIdeas: 'Share your ideas with the community',
    title: 'Title',
    content: 'Content',
    enterTitle: 'Enter a descriptive title...',
    enterContent: 'Write your post here...',
    mainImage: 'Main Image (optional)',
    additionalImages: 'Additional Images (optional)',
    chooseImage: 'Choose main image',
    chooseImages: 'Add more images',
    noImageSelected: 'No image selected',
    noAdditionalImagesSelected: 'No additional images selected',
    maxTagsHint: 'You can select up to 3 tags',
    maxTagsError: 'You can select up to 3 tags only',
    titleAndContentRequired: 'Title and content are required',
    failedToFetchTags: 'Failed to fetch tags',
    failedToLoadTags: 'Failed to load tags',
    failedToCreatePost: 'Failed to create post',
    createPostError: 'An error occurred while creating the post',
    serverError: 'Server returned non-JSON response',
    postCreatedWithMissingTags: 'Post created successfully, but some tags were not found: {tags}',
  },
  et: {
    // Navigation
    home: 'Avaleht',
    profile: 'Profiil',
    settings: 'Seaded',
    logout: 'Logi välja',
    language: 'Keel',
    english: 'Inglise',
    estonian: 'Eesti',
    security: 'Turvalisus',
    myPosts: 'Minu postitused',
    
    // Profile
    name: 'Nimi',
    username: 'Kasutajanimi',
    bio: 'Bio',
    saveChanges: 'Salvesta muudatused',
    cancel: 'Tühista',
    edit: 'Muuda',
    noBio: 'Bio puudub',
    characters: 'Märke',
    
    // Profile descriptions
    nameDescription: 'Sinu nimi kuvatakse profiililehel, postituste allkirjades ja vastustes.',
    usernameDescription: 'Sinu @kasutajanimi profiili identifitseerimiseks (ei saa muuta)',
    bioDescription: 'Räägi meile endast',
    
    // Security
    password: 'Parool',
    currentPassword: 'Praegune parool',
    newPassword: 'Uus parool',
    confirmPassword: 'Kinnita parool',
    changePassword: 'Muuda parooli',
    
    // Auth
    login: 'Logi sisse',
    register: 'Registreeru',
    email: 'E-post',
    forgotPassword: 'Unustasid parooli?',
    rememberMe: 'Jäta mind meelde',
    createAccount: 'Loo konto',
    alreadyHaveAccount: 'Sul on juba konto?',
    dontHaveAccount: 'Pole veel kontot?',
    
    // Posts
    createPost: 'Loo postitus',
    editPost: 'Muuda postitust',
    deletePost: 'Kustuta postitus',
    postTitle: 'Postituse pealkiri',
    postContent: 'Postituse sisu',
    publish: 'Avalda',
    comments: 'Kommentaarid',
    writeComment: 'Kirjuta kommentaar...',
    submit: 'Saada',
    
    // Common
    loading: 'Laadimine...',
    error: 'Viga',
    success: 'Edu',
    warning: 'Hoiatus',
    info: 'Info',
    search: 'Otsi',
    filter: 'Filtreeri',
    sort: 'Sorteeri',
    date: 'Kuupäev',
    author: 'Autor',
    category: 'Kategooria',
    tags: 'Sildid',
    
    // Header
    toggleTheme: 'Vaheta teemat',
    searchPlaceholder: 'Otsi ideid',
    userAvatar: 'Kasutaja avatar',
    signIn: 'Logi sisse',
    
    // Home page
    whatsHappening: 'Mis toimub?',
    post: 'Postita',
    trending: 'Trending',
    whoToFollow: 'Keda jälgida',
    showMore: 'Näita rohkem',
    showLess: 'Näita vähem',
    
    // Post actions
    like: 'Meeldib',
    comment: 'Kommenteeri',
    share: 'Jaga',
    save: 'Salvesta',
    report: 'Raporteeri',
    
    // Home page specific
    popularPosts: 'Populaarsed postitused',
    newPosts: 'Uued postitused',
    showingPostsWithTag: 'Näitan postitusi siltiga',
    readTime: '5 MIN LUGEMIST',
    untitled: 'Pealkirjata',
    noContent: 'Sisu puudub',
    unknown: 'Tundmatu',
    new: 'UUUS',
    
    // Create Post
    createNewPost: 'Loo uus postitus',
    shareIdeas: 'Jaga oma ideid kogukonnaga',
    title: 'Pealkiri',
    content: 'Sisu',
    enterTitle: 'Sisesta kirjeldav pealkiri...',
    enterContent: 'Kirjuta oma postitus siia...',
    mainImage: 'Põhipilt (valikuline)',
    additionalImages: 'Lisapildid (valikuline)',
    chooseImage: 'Vali põhipilt',
    chooseImages: 'Lisa rohkem pilte',
    noImageSelected: 'Pilti pole valitud',
    noAdditionalImagesSelected: 'Lisapilte pole valitud',
    maxTagsHint: 'Saad valida kuni 3 silti',
    maxTagsError: 'Saad valida ainult kuni 3 silti',
    titleAndContentRequired: 'Pealkiri ja sisu on kohustuslikud',
    failedToFetchTags: 'Siltide laadimine ebaõnnestus',
    failedToLoadTags: 'Siltide laadimine ebaõnnestus',
    failedToCreatePost: 'Postituse loomine ebaõnnestus',
    createPostError: 'Postituse loomisel tekkis viga',
    serverError: 'Server tagastas mittetekstilise vastuse',
    postCreatedWithMissingTags: 'Postitus loodi edukalt, kuid mõned sildid ei leitud: {tags}',
  }
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  const toggleLanguage = () => {
    setCurrentLanguage(prev => prev === 'en' ? 'et' : 'en');
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, toggleLanguage, languages }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}; 