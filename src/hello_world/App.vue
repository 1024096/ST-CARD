<template>
  <div
    class="relative flex items-center justify-center w-full overflow-hidden"
    :style="{ aspectRatio: '16/9', minHeight: '240px' }"
  >
    <button
      v-if="!showText"
      class="px-10 py-5 bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 text-white text-2xl font-extrabold rounded-2xl shadow-2xl cursor-pointer select-none hover:scale-110 hover:shadow-orange-500/50 active:scale-95"
      :style="btnStyle"
      @click="explode"
    >
      点我!
    </button>

    <div
      v-if="showText"
      :style="textStyle"
      class="text-5xl font-black bg-gradient-to-r from-yellow-300 via-red-400 to-pink-400 bg-clip-text text-transparent"
    >
      Hello World
    </div>

    <span
      v-for="p in particles"
      :key="p.id"
      class="absolute rounded-full"
      :style="{
        width: p.size + 'px',
        height: p.size + 'px',
        backgroundColor: p.color,
        left: 'calc(50% - ' + p.size / 2 + 'px)',
        top: 'calc(50% - ' + p.size / 2 + 'px)',
        transition: `transform ${p.duration}s ease-out ${p.delay}s, opacity ${p.duration}s ease-out ${p.delay}s`,
        transform: 'translate(0, 0) scale(1)',
        opacity: 1,
      }"
      :ref="(el: any) => animateParticle(el, p)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const COLORS = ['#ff4444', '#ff8800', '#ffdd00', '#44ff44', '#4488ff', '#ff44ff', '#00ddff', '#ff6666', '#ffaa00', '#88ff88', '#ff8888']

const particles = ref<{ id: number; size: number; color: string; dx: string; dy: string; duration: number; delay: number }[]>([])
const exploded = ref(false)
const showText = ref(false)
const textVisible = ref(false)

const btnStyle = reactive({
  transition: 'transform 0.15s, opacity 0.15s',
  transform: 'scale(1)',
  opacity: 1,
})

const textStyle = reactive({
  transition: 'transform 0.5s ease-out, opacity 0.5s ease-out',
  transform: 'scale(0) rotate(-10deg)',
  opacity: 0,
})

function animateParticle(el: any, p: { dx: string; dy: string; duration: number }) {
  if (!el) return
  requestAnimationFrame(() => {
    el.style.transform = `translate(${p.dx}px, ${p.dy}px) scale(0)`
    el.style.opacity = '0'
  })
}

function explode() {
  exploded.value = true
  btnStyle.transform = 'scale(1.5)'
  btnStyle.opacity = '0'

  const items: typeof particles.value = []
  for (let i = 0; i < 36; i++) {
    const angle = (Math.PI * 2 * i) / 36 + (Math.random() - 0.5) * 0.3
    const distance = 80 + Math.random() * 140
    items.push({
      id: i,
      size: 6 + Math.random() * 16,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      dx: (Math.cos(angle) * distance).toFixed(1),
      dy: (Math.sin(angle) * distance).toFixed(1),
      duration: 0.6 + Math.random() * 0.8,
      delay: Math.random() * 0.15,
    })
  }
  particles.value = items

  setTimeout(() => {
    particles.value = []
    showText.value = true
    textVisible.value = true
    requestAnimationFrame(() => {
      textStyle.transform = 'scale(1) rotate(0deg)'
      textStyle.opacity = '1'
    })
  }, 1400)
}
</script>
