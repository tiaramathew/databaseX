import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'VectorHub',
        short_name: 'VectorHub',
        description: 'Universal Vector Database & Integration Manager',
        start_url: '/',
        display: 'standalone',
        background_color: '#fafafa',
        theme_color: '#fafafa',
        icons: [
            {
                src: '/favicon.ico',
                sizes: 'any',
                type: 'image/x-icon',
            },
        ],
    };
}
