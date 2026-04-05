import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import HeroSection from '../components/sections/HeroSection';
import CategoriesSection from '../components/sections/CategoriesSection';
import AboutSection from '../components/sections/AboutSection';
import ProductsSection from '../components/sections/ProductsSection';
import AIGeneratorSection from '../components/sections/AIGeneratorSection';
import ContactSection from '../components/sections/ContactSection';
import BackToTop from '../components/ui/BackToTop';

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState('ყველა');

  const handleCategorySelected = (category: string) => {
    setActiveCategory(category);
  };

  return (
    <>
      <Helmet>
        <title>Kale Group | პრემიუმ ავეჯის წარმოება | Premium Furniture Georgia</title>
        <meta name="description" content="Kale Group გთავაზობთ უმაღლესი ხარისხის ავეჯს: სამზარეულოები, საძინებლები, რბილი ავეჯი. Premium quality bespoke furniture in Tbilisi, Georgia." />
      </Helmet>
      <HeroSection />
      
      <CategoriesSection onCategorySelected={handleCategorySelected} />
      
      <AboutSection />
      
      <ProductsSection 
        activeCategory={activeCategory} 
        setActiveCategory={setActiveCategory}
      />
      
      <AIGeneratorSection />
      
      <ContactSection />
      
      <BackToTop />
    </>
  );
}
