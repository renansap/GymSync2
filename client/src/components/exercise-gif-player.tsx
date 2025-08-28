import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, RotateCcw, Maximize2 } from 'lucide-react';
import { findExerciseGif } from '@/lib/exercise-gifs';

interface ExerciseGifPlayerProps {
  exerciseName: string;
  exerciseGroup?: string;
  customGifUrl?: string;
  className?: string;
  autoPlay?: boolean;
  showControls?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ExerciseGifPlayer({
  exerciseName,
  exerciseGroup,
  customGifUrl,
  className = '',
  autoPlay = true,
  showControls = true,
  size = 'md'
}: ExerciseGifPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Busca o GIF baseado no nome do exercício
  const gifUrl = customGifUrl || findExerciseGif(exerciseName);
  
  const sizeClasses = {
    sm: 'w-32 h-24',
    md: 'w-48 h-36', 
    lg: 'w-64 h-48'
  };

  const handlePlay = () => {
    if (imgRef.current) {
      // Para GIFs, recarregamos a imagem para reiniciar a animação
      const currentSrc = imgRef.current.src;
      imgRef.current.src = '';
      imgRef.current.src = currentSrc;
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    // Para simular pause em GIF, podemos parar no primeiro frame
  };

  const handleRestart = () => {
    handlePlay();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleImageLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleImageError = () => {
    setHasError(true);
    setIsLoaded(false);
  };

  useEffect(() => {
    if (autoPlay && gifUrl) {
      setIsPlaying(true);
    }
  }, [autoPlay, gifUrl]);

  if (!gifUrl) {
    return (
      <Card className={`${className} ${sizeClasses[size]}`}>
        <CardContent className="flex items-center justify-center h-full p-4">
          <div className="text-center text-muted-foreground">
            <div className="text-2xl mb-2">🏋️</div>
            <p className="text-sm">GIF não encontrado</p>
            <p className="text-xs mt-1">{exerciseName}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasError) {
    return (
      <Card className={`${className} ${sizeClasses[size]}`}>
        <CardContent className="flex items-center justify-center h-full p-4">
          <div className="text-center text-muted-foreground">
            <div className="text-2xl mb-2">❌</div>
            <p className="text-sm">Erro ao carregar</p>
            <p className="text-xs mt-1">{exerciseName}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Card className={`${isFullscreen ? 'fixed inset-4 z-50 flex items-center justify-center bg-black/90' : sizeClasses[size]} overflow-hidden`}>
        <CardContent className="p-0 h-full relative">
          {/* GIF Image */}
          <img
            ref={imgRef}
            src={gifUrl}
            alt={`Demonstração do exercício: ${exerciseName}`}
            className={`w-full h-full object-cover ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            data-testid={`gif-${exerciseName.toLowerCase().replace(/\s+/g, '-')}`}
          />
          
          {/* Loading state */}
          {!isLoaded && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          
          {/* Exercise name overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
            <p className="text-white text-xs font-medium truncate">
              {exerciseName}
            </p>
            {exerciseGroup && (
              <p className="text-white/70 text-xs truncate">
                {exerciseGroup}
              </p>
            )}
          </div>
          
          {/* Controls */}
          {showControls && (
            <div className="absolute top-2 right-2 flex gap-1">
              <Button
                size="sm"
                variant="secondary"
                className="h-6 w-6 p-0 bg-black/50 hover:bg-black/70"
                onClick={handleRestart}
                data-testid="button-restart-gif"
              >
                <RotateCcw className="h-3 w-3 text-white" />
              </Button>
              
              <Button
                size="sm"
                variant="secondary"
                className="h-6 w-6 p-0 bg-black/50 hover:bg-black/70"
                onClick={toggleFullscreen}
                data-testid="button-fullscreen-gif"
              >
                <Maximize2 className="h-3 w-3 text-white" />
              </Button>
            </div>
          )}
          
          {/* Fullscreen close button */}
          {isFullscreen && (
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70"
              onClick={toggleFullscreen}
              data-testid="button-close-fullscreen"
            >
              ✕
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Componente para exibir lista de GIFs
interface ExerciseGifGridProps {
  exercises: Array<{
    name: string;
    group?: string;
    gifUrl?: string;
  }>;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  columns?: number;
}

export function ExerciseGifGrid({
  exercises,
  className = '',
  size = 'md',
  columns = 3
}: ExerciseGifGridProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2', 
    3: 'grid-cols-3',
    4: 'grid-cols-4'
  };

  return (
    <div className={`grid ${gridClasses[columns as keyof typeof gridClasses]} gap-4 ${className}`}>
      {exercises.map((exercise, index) => (
        <ExerciseGifPlayer
          key={`${exercise.name}-${index}`}
          exerciseName={exercise.name}
          exerciseGroup={exercise.group}
          customGifUrl={exercise.gifUrl}
          size={size}
          autoPlay={false}
          data-testid={`exercise-gif-${index}`}
        />
      ))}
    </div>
  );
}