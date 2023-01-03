const effectStack = []
function useState(value) {
    // 保存订阅该state变化的effect
    const subs = new Set()
    const getter = () => {
        const effect = effectStack[effectStack.length - 1]
        if(effect) {
            // 建立订阅发布关系
            subscribe(effect, subs)
        }
        return value
    }
    const setter = (newValue ) => {
        value = newValue
        // 通知所有订阅了该state的effect
        for(let eff of [...subs]) {
            eff.execute()
        }
    }
    return [getter, setter]
}

function useEffect(callback) {
    const execute = () => {
        // 重置依赖
        cleanUp(effect)
        // 将当前effect 推入堆栈
        effectStack.push(effect)

        try {
            callback()
        } finally {
            effectStack.pop()
        }
    }
    const effect = {
        execute,
        deps: new Set()
    }
    // 立即执行一遍，确立订阅发布关系
    execute()
}

function cleanUp(effect) {
  for (let subs of effect.deps) {
       subs.delete(effect)
  }
    effect.deps.clear()
}

function subscribe(effect, subs) {
  // 订阅关系确立
  subs.add(effect)
  effect.deps.add(subs)
}

function useMemo(callback) {
    const [s, set] = useState();
    useEffect(() => {
        set(callback())
    })
    return s
}

//
const [state, setState] = useState('LHJ')
const [state2, setState2] = useState('CMP')
const [show, setShow] = useState(true)
const whoIsHere = useMemo(() => {
    if(!show()) return state()
    return `${state()} and ${state2()}`
})

useEffect(() => console.log('谁在这', whoIsHere()))

setState(3)