// Автор: Стас Чашин @chastnik
import { useEffect, useRef, type FC } from "react"
import { useTheme } from '../contexts/ThemeContext'

interface Ball {
  fillColor: string
  radius: number
  x: number
  y: number
  scaleX: number
  scaleY: number
  rotation: number
  vx: number
  vy: number
  draw: (ctx: CanvasRenderingContext2D) => void
}

interface BouncingBallsBackgroundProps {
  numBalls?: number
  opacity?: number
  minRadius?: number
  maxRadius?: number
  speed?: number
  bounceDamping?: number
  gravity?: number
  friction?: number
  interactionRadius?: number
  interactionScale?: number
  interactive?: boolean
  followMouse?: boolean
}

export const BouncingBallsBackground: FC<BouncingBallsBackgroundProps> = ({
  numBalls = 50,
  opacity = 0.3,
  minRadius = 2,
  maxRadius = 8,
  speed = 0.5,
  bounceDamping = 0.9,
  gravity = 0,
  friction = 0.999,
  interactionRadius = 100,
  interactionScale = 2,
  interactive = true,
  followMouse = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { isDark } = useTheme()

  // Цвета для светлой и темной темы
  const lightColors = [
    'rgba(59, 130, 246, 0.3)', // blue-500
    'rgba(139, 92, 246, 0.3)', // violet-500
    'rgba(236, 72, 153, 0.3)', // pink-500
    'rgba(34, 197, 94, 0.3)',  // green-500
    'rgba(251, 191, 36, 0.3)', // amber-400
  ]

  const darkColors = [
    'rgba(96, 165, 250, 0.4)', // blue-400
    'rgba(167, 139, 250, 0.4)', // violet-400
    'rgba(244, 114, 182, 0.4)', // pink-400
    'rgba(74, 222, 128, 0.4)',  // green-400
    'rgba(251, 191, 36, 0.4)',  // amber-400
  ]

  const colors = isDark ? darkColors : lightColors

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    let W = (canvas.width = window.innerWidth)
    let H = (canvas.height = window.innerHeight)

    const getRandomColor = (): string => {
      return colors[Math.floor(Math.random() * colors.length)]
    }

    const createBall = (fillColor: string, radius: number): Ball => ({
      fillColor,
      radius,
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      vx: 0,
      vy: 0,
      draw(ctx) {
        ctx.save()
        ctx.translate(this.x, this.y)
        ctx.scale(this.scaleX, this.scaleY)
        ctx.rotate(this.rotation)
        ctx.fillStyle = this.fillColor
        ctx.beginPath()
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      },
    })

    // Mouse interaction
    const mouse = { x: W / 2, y: H / 2 }
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.pageX - canvas.offsetLeft
      mouse.y = e.pageY - canvas.offsetTop
    }
    if (interactive) canvas.addEventListener("mousemove", handleMouseMove)

    // Create balls
    const balls: Ball[] = []
    for (let i = 0; i < numBalls; i++) {
      const ball = createBall(getRandomColor(), Math.random() * (maxRadius - minRadius) + minRadius)
      ball.x = Math.random() * W
      ball.y = Math.random() * H
      ball.vx = (Math.random() * 2 - 1) * speed
      ball.vy = (Math.random() * 2 - 1) * speed
      balls.push(ball)
    }

    const updateBall = (ball: Ball) => {
      // physics
      ball.vy += gravity
      ball.vx *= friction
      ball.vy *= friction

      ball.x += ball.vx
      ball.y += ball.vy

      // boundary bounce
      if (ball.x + ball.radius > W) {
        ball.x = W - ball.radius
        ball.vx *= -bounceDamping
      } else if (ball.x - ball.radius < 0) {
        ball.x = ball.radius
        ball.vx *= -bounceDamping
      }

      if (ball.y + ball.radius > H) {
        ball.y = H - ball.radius
        ball.vy *= -bounceDamping
      } else if (ball.y - ball.radius < 0) {
        ball.y = ball.radius
        ball.vy *= -bounceDamping
      }

      // mouse attraction
      if (followMouse) {
        const dx = mouse.x - ball.x
        const dy = mouse.y - ball.y
        ball.vx += dx * 0.0005
        ball.vy += dy * 0.0005
      }
    }

    const enlargeBalls = (ball: Ball) => {
      if (!interactive) return
      const dx = mouse.x - ball.x
      const dy = mouse.y - ball.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < interactionRadius) {
        ball.scaleX = ball.scaleY = interactionScale
      } else if (distance < interactionRadius * 1.5) {
        ball.scaleX = ball.scaleY = interactionScale * 0.6
      } else {
        ball.scaleX = ball.scaleY = 1
      }
    }

    const animate = () => {
      requestAnimationFrame(animate)
      ctx.clearRect(0, 0, W, H)

      balls.forEach((ball) => {
        enlargeBalls(ball)
        updateBall(ball)
        ball.draw(ctx)
      })
    }

    animate()

    const handleResize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    window.addEventListener("resize", handleResize)

    return () => {
      if (interactive) canvas.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("resize", handleResize)
    }
  }, [
    numBalls,
    opacity,
    minRadius,
    maxRadius,
    speed,
    bounceDamping,
    gravity,
    friction,
    interactionRadius,
    interactionScale,
    interactive,
    followMouse,
    colors,
    isDark,
  ])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        display: "block",
        width: "100%",
        height: "100%",
      }}
    />
  )
}

