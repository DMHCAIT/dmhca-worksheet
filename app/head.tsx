export default function Head() {
  return (
    <>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#3b82f6" />
      <meta name="description" content="DMHCA Work Tracker - Employee Management System" />
      
      {/* Optimize resource hints */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      {/* Prevent unnecessary preloading */}
      <meta name="format-detection" content="telephone=no" />
      <meta name="robots" content="index,follow" />
    </>
  )
}