<template>
  <div
    class="w-full"
    :style="{
      background: 'linear-gradient(180deg, #0d0404 0%, #1a0810 30%, #2d0d18 60%, #1a0810 100%)',
      minHeight: '600px',
      padding: '28px 20px',
      fontFamily: 'Georgia, serif',
    }"
  >
    <!-- ===== 顶部帷幕装饰 ===== -->
    <div :style="curtainStyle">
      <div
        v-for="i in 7"
        :key="i"
        :style="{
          width: '14.28%',
          height: '18px',
          background: 'linear-gradient(180deg, #6b1a2a 0%, #8b1a30 40%, #4a0a15 100%)',
          borderRadius: '0 0 50% 50%',
          boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.3)',
        }"
      />
    </div>

    <!-- ===== 标题区 ===== -->
    <div style="text-align: center; padding: 24px 0 8px;">
      <div
        :style="{
          color: '#c9a96e',
          fontSize: '11px',
          letterSpacing: '10px',
          textTransform: 'uppercase',
          opacity: 0.7,
        }"
      >
        ◆ Établissement de Nuit ◆
      </div>
      <div
        :style="{
          color: '#f0e6d3',
          fontSize: '36px',
          fontWeight: 'bold',
          margin: '8px 0',
          textShadow: '0 0 30px rgba(180,50,80,0.4)',
        }"
      >
        夜 莺 之 巢
      </div>
      <div
        :style="{
          width: '180px',
          height: '1px',
          margin: '12px auto',
          background: 'linear-gradient(90deg, transparent, #c9a96e 20%, #d4af37 50%, #c9a96e 80%, transparent)',
        }"
      />
      <div
        :style="{
          color: '#8b7355',
          fontSize: '12px',
          fontStyle: 'italic',
          letterSpacing: '3px',
        }"
      >
        &mdash; 每位佳人都是一个夜晚的故事 &mdash;
      </div>
    </div>

    <!-- ===== 卡片网格 ===== -->
    <div
      class="grid"
      :style="{
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        maxWidth: '840px',
        margin: '20px auto 0',
      }"
    >
      <div
        v-for="(girl, idx) in girls"
        :key="girl.id"
        :style="cardWrapperStyle(idx)"
        @click="toggle(girl.id)"
      >
        <!-- ===== 相框边框 ===== -->
        <div
          :style="{
            border: '2px solid #c9a96e40',
            borderRadius: '3px',
            background: 'rgba(18, 6, 10, 0.88)',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'box-shadow 0.4s, border-color 0.4s',
          }"
          :ref="(el: any) => setupHover(el, girl.id)"
        >
          <!-- 肖像区 -->
          <div
            :style="{
              aspectRatio: '3/4',
              background: 'linear-gradient(160deg, #2a0d18 0%, #1a0810 40%, #0d0408 100%)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }"
          >
            <!-- 相框内角装饰 -->
            <div v-for="corner in ['tl','tr','bl','br']" :key="corner" :style="cornerOrnament(corner)" />
            <!-- 占位装饰 -->
            <div style="text-align: center; z-index: 1;">
              <div :style="{ color: '#c9a96e30', fontSize: '56px', lineHeight: '1' }">✧</div>
              <div :style="{ color: '#8b735540', fontSize: '10px', marginTop: '8px', letterSpacing: '2px' }">
                点击添加肖像
              </div>
            </div>
            <!-- 底边标签 -->
            <div
              :style="{
                position: 'absolute',
                bottom: '8px',
                left: '0',
                right: '0',
                textAlign: 'center',
                color: '#c9a96e50',
                fontSize: '9px',
                letterSpacing: '2px',
                fontStyle: 'italic',
              }"
            >
              {{ girl.title }}
            </div>
          </div>

          <!-- 姓名区 -->
          <div
            :style="{
              padding: '10px 12px',
              textAlign: 'center',
              borderTop: '1px solid #c9a96e20',
            }"
          >
            <div
              :style="{
                color: '#f0e6d3',
                fontSize: '17px',
                fontWeight: 'bold',
                letterSpacing: '2px',
              }"
            >
              {{ girl.name }}
            </div>
            <div
              :style="{
                color: '#8b7355',
                fontSize: '11px',
                marginTop: '2px',
              }"
            >
              {{ girl.specialty }}
            </div>
          </div>

          <!-- ===== 展开详情 ===== -->
            <div
              :style="expandDetailStyle(girl.id)"
            >
              <!-- 引言 -->
              <div
                :style="{
                  color: '#d4af37',
                  fontSize: '12px',
                  fontStyle: 'italic',
                  lineHeight: '1.6',
                  marginBottom: '10px',
                  paddingLeft: '8px',
                  borderLeft: '2px solid #c9a96e40',
                }"
              >
                {{ girl.quote }}
              </div>
              <!-- 标签行 -->
              <div :style="detailRowStyle">
                <span :style="labelStyle">特 长</span>
                <span :style="valueStyle">{{ girl.specialty }}</span>
              </div>
              <div :style="detailRowStyle">
                <span :style="labelStyle">床 上 功 夫</span>
                <span :style="valueStyle">{{ girl.skill }}</span>
              </div>
              <!-- 预约按钮 -->
              <div
                :style="{
                  marginTop: '12px',
                  padding: '6px 0',
                  textAlign: 'center',
                  color: '#c9a96e',
                  fontSize: '11px',
                  letterSpacing: '4px',
                  border: '1px solid #c9a96e30',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  transition: 'background 0.3s',
                }"
                @click.stop="selected = girl.id"
              >
                ✦ 钦 点 ✦
              </div>
            </div>
        </div>
      </div>
    </div>

    <!-- ===== 底部装饰 ===== -->
    <div style="text-align: center; padding: 28px 0 8px;">
      <div
        :style="{
          color: '#8b735530',
          fontSize: '10px',
          letterSpacing: '6px',
        }"
      >
        ✦ DISCRÉTION ASSURÉE ✦
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { girls } from './girls'

const expandedId = ref<number | null>(null)
const selected = ref<number | null>(null)
const hovered = reactive(new Set<number>())

const curtainStyle = {
  display: 'flex',
  justifyContent: 'center',
  gap: '0',
  marginBottom: '8px',
}

function toggle(id: number) {
  expandedId.value = expandedId.value === id ? null : id
}

function setupHover(el: any, id: number) {
  if (!el) return
  el.addEventListener('mouseenter', () => hovered.add(id))
  el.addEventListener('mouseleave', () => hovered.delete(id))
}

function cardWrapperStyle(idx: number) {
  const baseOpacity = expandedId.value === null || expandedId.value === girls[idx].id ? 1 : 0.4
  return {
    transition: 'opacity 0.5s, transform 0.4s',
    opacity: baseOpacity,
    transform: expandedId.value === girls[idx].id ? 'scale(1.02)' : 'scale(1)',
  }
}

function cornerOrnament(pos: string) {
  const base: any = {
    position: 'absolute',
    width: '14px',
    height: '14px',
    borderColor: '#c9a96e30',
    zIndex: 2,
  }
  if (pos === 'tl') return { ...base, top: '6px', left: '6px', borderTop: '1px solid #c9a96e40', borderLeft: '1px solid #c9a96e40' }
  if (pos === 'tr') return { ...base, top: '6px', right: '6px', borderTop: '1px solid #c9a96e40', borderRight: '1px solid #c9a96e40' }
  if (pos === 'bl') return { ...base, bottom: '6px', left: '6px', borderBottom: '1px solid #c9a96e40', borderLeft: '1px solid #c9a96e40' }
  return { ...base, bottom: '6px', right: '6px', borderBottom: '1px solid #c9a96e40', borderRight: '1px solid #c9a96e40' }
}

function expandDetailStyle(id: number) {
  const open = expandedId.value === id
  return {
    borderTop: '1px solid #c9a96e30',
    padding: open ? '14px 14px 18px' : '0 14px',
    background: 'linear-gradient(180deg, rgba(20,6,10,0.6), rgba(30,8,16,0.8))',
    transition: 'all 0.4s ease',
    maxHeight: open ? '400px' : '0',
    opacity: open ? 1 : 0,
    overflow: 'hidden',
  }
}

const detailRowStyle = {
  marginBottom: '8px',
  lineHeight: '1.7',
}

const labelStyle = {
  color: '#c9a96e',
  fontSize: '11px',
  letterSpacing: '3px',
  marginRight: '8px',
}

const valueStyle = {
  color: '#e8c4c4',
  fontSize: '13px',
}
</script>
