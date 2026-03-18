import json
import os
import random
from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Arboles")

SAVE_FILE = "save.json"

class Nodo:
    def __init__(self, valor):
        self.valor = valor
        self.izquierda = None
        self.derecha = None

    def transformar_a_diccionario(self):
        return {
            "valor": self.valor,
            "izquierda": self.izquierda.transformar_a_diccionario() if self.izquierda else None,
            "derecha": self.derecha.transformar_a_diccionario() if self.derecha else None
        }

def transformar_a_nodo(valor):
    if not valor:
        return None
    nodo = Nodo(valor["valor"])
    nodo.izquierda = transformar_a_nodo(valor["izquierda"])
    nodo.derecha = transformar_a_nodo(valor["derecha"])
    return nodo

def extraer_variables(nodo, vars_set):
    if not nodo:
        return
    if str(nodo.valor).isalpha():
        vars_set.add(nodo.valor)
    extraer_variables(nodo.izquierda, vars_set)
    extraer_variables(nodo.derecha, vars_set)

class Arbol:
    def __init__(self):
        self.raiz = None
        self.cargar()

    def insert(self, valor):
        if not self.raiz:
            self.raiz = Nodo(valor)
            self.guardar()
            return True
        else:
            if self._exists(self.raiz, valor):
                return False
            self.insertar_recursivo(self.raiz, valor)
            self.guardar()
            return True

    def _exists(self, actual, valor):
        if not actual:
            return False
        if actual.valor == valor:
            return True
        if valor < actual.valor:
            return self._exists(actual.izquierda, valor)
        else:
            return self._exists(actual.derecha, valor)

    def insertar_recursivo(self, actual, valor):
        if valor < actual.valor:
            if actual.izquierda is None:
                actual.izquierda = Nodo(valor)
            else:
                self.insertar_recursivo(actual.izquierda, valor)
        else:
            if actual.derecha is None:
                actual.derecha = Nodo(valor)
            else:
                self.insertar_recursivo(actual.derecha, valor)

    def guardar(self):
        valor = self.raiz.transformar_a_diccionario() if self.raiz else None
        with open(SAVE_FILE, "w") as f:
            json.dump(valor, f)

    def cargar(self):
        if os.path.exists(SAVE_FILE):
            try:
                with open(SAVE_FILE, "r") as f:
                    valor = json.load(f)
                    self.raiz = transformar_a_nodo(valor)
            except (json.JSONDecodeError, KeyError):
                self.raiz = None

    def reiniciar(self):
        self.raiz = None
        if os.path.exists(SAVE_FILE):
            os.remove(SAVE_FILE)
    def eliminar(self, valor):
        self.raiz = self._eliminar_rec(self.raiz, valor)
        self.guardar()

    def _eliminar_rec(self, nodo, valor):
        if not nodo:
            return nodo

        if valor < nodo.valor:
            nodo.izquierda = self._eliminar_rec(nodo.izquierda, valor)

        elif valor > nodo.valor:
            nodo.derecha = self._eliminar_rec(nodo.derecha, valor)

        else:
            if nodo.izquierda is None:
                return nodo.derecha
            elif nodo.derecha is None:
                return nodo.izquierda

            sucesor = self._min(nodo.derecha)
            nodo.valor = sucesor.valor
            nodo.derecha = self._eliminar_rec(nodo.derecha, sucesor.valor)

        return nodo

    def _min(self,nodo):
        while nodo.izquierda:
            nodo = nodo.izquierda
        return nodo
    def eliminar_subarbol(self, valor):
        def rec(nodo):
            if not nodo:
                return None
            if nodo.valor == valor:
                return None
            nodo.izquierda = rec(nodo.izquierda)
            nodo.derecha = rec(nodo.derecha)
            return nodo

        self.raiz = rec(self.raiz)
        self.guardar()
    def valores(self):
        lista=[]
        def inorder(n):
            if not n: return
            inorder(n.izquierda)
            lista.append(n.valor)
            inorder(n.derecha)
        inorder(self.raiz)
        return lista
    def balancear(self):
        valores=self.valores()

        def construir(arr):
            if not arr:
                return None
            mid=len(arr)//2
            nodo=Nodo(arr[mid])
            nodo.izquierda=construir(arr[:mid])
            nodo.derecha=construir(arr[mid+1:])
            return nodo

        self.raiz=construir(valores)
        self.guardar()

    def aleatorio(self,n=10):
        self.raiz=None
        nums=random.sample(range(1,100),n)
        for i in nums:
            self.insert(i)
    def arbol_expresion(self, expr):
        def precedencia(op):
            if op in ('+', '-'): return 1
            if op in ('*', '/'): return 2
            if op in ('^'): return 3
            return 0

        # Tokenizador simple
        import re
        raw_tokens = re.findall(r'\d+\.?\d*|[a-zA-Z]|[+/*^-]|\(|\)', expr.replace(" ", ""))

        # Manejar multiplicación implícita y signos unarios
        tokens = []
        for i in range(len(raw_tokens)):
            curr = raw_tokens[i]

            # Casos de signo unario: '-' o '+' al inicio o después de '('
            if curr in ('-', '+'):
                if i == 0 or raw_tokens[i-1] == '(':
                    tokens.append('0')

            tokens.append(curr)

            if i + 1 < len(raw_tokens):
                nxt = raw_tokens[i+1]
                
                # Casos de multiplicación implícita:
                # 1. Número/Variable seguido de Variable/Paréntesis abierto: 5X, XY, 5(, X(
                # 2. Paréntesis cerrado seguido de Número/Variable/Paréntesis abierto: )5, )X, )(
                
                cond1 = (curr.replace(".", "").isdigit() or curr.isalpha() or curr == ')')
                cond2 = (nxt.replace(".", "").isdigit() or nxt.isalpha() or nxt == '(')
                
                if cond1 and cond2:
                    if not (curr.replace(".", "").isdigit() and nxt.replace(".", "").isdigit()):
                         tokens.append('*')

        # Convertir a postfijo (Shunting Yard)
        salida = []
        pila = []

        for token in tokens:
            if token.replace(".", "").isdigit() or token.isalpha():
                salida.append(token)
            elif token == '(':
                pila.append(token)
            elif token == ')':
                while pila and pila[-1] != '(':
                    salida.append(pila.pop())
                if pila: pila.pop()
            else:
                while pila and pila[-1] != '(' and precedencia(pila[-1]) >= precedencia(token):
                    salida.append(pila.pop())
                pila.append(token)

        while pila:
            salida.append(pila.pop())

        # Construir árbol desde postfijo
        stack = []
        for token in salida:
            if token.replace(".", "").isdigit() or token.isalpha():
                stack.append(Nodo(token))
            else:
                if len(stack) < 2: continue
                nodo = Nodo(token)
                nodo.derecha = stack.pop()
                nodo.izquierda = stack.pop()
                stack.append(nodo)

        if stack:
            self.raiz = stack[0]
            self.guardar()

    def evaluar(self, vars_values):
        def _evaluar_rec(nodo):
            if not nodo:
                return 0
            val = str(nodo.valor)
            if val.replace(".", "").isdigit():
                return float(val)
            if val.isalpha():
                return float(vars_values.get(val, 0))

            izq = _evaluar_rec(nodo.izquierda)
            der = _evaluar_rec(nodo.derecha)

            if val == '+': return izq + der
            if val == '-': return izq - der
            if val == '*': return izq * der
            if val == '/': return izq / der if der != 0 else 0
            if val == '^': return izq ** der
            return 0

        return _evaluar_rec(self.raiz)
arbol = Arbol()

@app.post("/add")
async def add_node(request: Request):
    data = await request.json()
    if "value" not in data:
        raise HTTPException(status_code=400, detail="Missing value")

    valor = int(data["value"])
    if not arbol.insert(valor):
        return {"status": "error", "message": "El nodo ya existe"}
    return {"status": "success", "tree": arbol.raiz.transformar_a_diccionario() if arbol.raiz else None}

@app.get("/tree")
async def get_tree():
    return arbol.raiz.transformar_a_diccionario() if arbol.raiz else None

@app.post("/reset")
async def reset_tree():
    arbol.reiniciar()
    return {"status": "success"}
@app.post("/delete")
async def delete_node(request:Request):
    data=await request.json()
    arbol.eliminar(int(data["value"]))
    return arbol.raiz.transformar_a_diccionario() if arbol.raiz else None


@app.post("/subtree")
async def subtree(request:Request):
    data=await request.json()
    arbol.eliminar_subarbol(int(data["value"]))
    return arbol.raiz.transformar_a_diccionario() if arbol.raiz else None


@app.post("/balance")
async def balance():
    arbol.balancear()
    return arbol.raiz.transformar_a_diccionario() if arbol.raiz else None


@app.post("/random")
async def random_tree():
    arbol.aleatorio()
    return arbol.raiz.transformar_a_diccionario()


@app.post("/expression")
async def expression(request:Request):
    data=await request.json()
    arbol.arbol_expresion(data["expr"])
    variables = set()
    extraer_variables(arbol.raiz, variables)
    return {
        "tree": arbol.raiz.transformar_a_diccionario(),
        "variables": list(variables)
    }

@app.post("/evaluate")
async def evaluate(request:Request):
    data = await request.json()
    values = data.get("values", {})
    result = arbol.evaluar(values)
    return {"result": result}


@app.post("/load_json")
async def load_json(request:Request):
    data=await request.json()
    arbol.raiz=transformar_a_nodo(data)
    arbol.guardar()
    return arbol.raiz.transformar_a_diccionario()

app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
